"""
Import Service - handles parsing and importing transaction files.
"""

import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy.orm import Session

from app.schemas.import_profile import (
    ParsedRow,
    ParseResult,
    MappingItem,
    ImportResult,
)
from app.schemas.transaction import TransactionCreate
from app.crud import import_profile as import_crud
from app.crud import transaction as transaction_crud


# Expected column headers (case-insensitive)
EXPECTED_COLUMNS = {
    "id": ["id"],
    "date": ["date"],
    "categories": ["categories", "category"],
    "amount": ["amount"],
    "accounts": ["accounts", "account"],
    "description": ["description", "desc"],
}


def normalize_header(header: str) -> str:
    """Normalize a header string for matching."""
    return header.strip().lower()


def find_column_index(headers: list[str], column_key: str) -> int | None:
    """Find the index of a column by its key, checking alternative names."""
    normalized_headers = [normalize_header(h) for h in headers]
    for alt_name in EXPECTED_COLUMNS.get(column_key, []):
        if alt_name in normalized_headers:
            return normalized_headers.index(alt_name)
    return None


def parse_csv_content(content: bytes) -> tuple[list[str], list[list[str]]]:
    """
    Parse CSV content and return headers and rows.
    Tries different encodings.
    """
    for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
        try:
            text = content.decode(encoding)
            reader = csv.reader(io.StringIO(text))
            rows = list(reader)
            if rows:
                return rows[0], rows[1:]
        except (UnicodeDecodeError, csv.Error):
            continue

    raise ValueError("Unable to parse CSV file. Please check the file encoding.")


def parse_excel_content(content: bytes) -> tuple[list[str], list[list[str]]]:
    """
    Parse Excel content and return headers and rows.
    """
    try:
        from openpyxl import load_workbook
    except ImportError:
        raise ValueError("Excel support requires openpyxl. Please install it.")

    wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active

    if ws is None:
        raise ValueError("Excel file has no active worksheet.")

    rows = []
    for row in ws.iter_rows(values_only=True):
        # Convert None to empty string, ensure all values are strings
        rows.append([str(cell) if cell is not None else "" for cell in row])

    if not rows:
        raise ValueError("Excel file contains no data.")

    return rows[0], rows[1:]


def parse_file(file_content: bytes, filename: str) -> list[ParsedRow]:
    """
    Parse an import file and return a list of ParsedRow objects.

    Args:
        file_content: Raw file bytes
        filename: Original filename (used to detect format)

    Returns:
        List of ParsedRow objects

    Raises:
        ValueError: If file cannot be parsed or is missing required columns
    """
    filename_lower = filename.lower()

    if filename_lower.endswith(".csv"):
        headers, data_rows = parse_csv_content(file_content)
    elif filename_lower.endswith((".xlsx", ".xls")):
        headers, data_rows = parse_excel_content(file_content)
    else:
        raise ValueError(
            f"Unsupported file format. Please use CSV or Excel (.xlsx). Got: {filename}"
        )

    if not data_rows:
        raise ValueError("File contains no data rows.")

    # Find column indices
    col_indices = {}
    missing_columns = []

    for col_key in ["id", "date", "categories", "amount", "accounts", "description"]:
        idx = find_column_index(headers, col_key)
        if idx is None:
            missing_columns.append(col_key)
        else:
            col_indices[col_key] = idx

    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

    # Parse each row
    parsed_rows = []
    for row_index, row in enumerate(data_rows):
        # Skip empty rows
        if not any(cell.strip() for cell in row):
            continue

        # Safely get values with bounds checking
        def get_value(key: str) -> str:
            idx = col_indices[key]
            if idx < len(row):
                return row[idx].strip()
            return ""

        external_id = get_value("id")
        date_str = get_value("date")
        category_value = get_value("categories")
        amount_str = get_value("amount")
        account_value = get_value("accounts")
        description = get_value("description")

        # Skip rows without essential data
        if not date_str or not amount_str:
            continue

        # Parse amount
        try:
            # Remove currency symbols and thousands separators
            amount_clean = amount_str.replace(",", "").replace("$", "").replace("Rp", "").strip()
            amount = Decimal(amount_clean)
        except (InvalidOperation, ValueError):
            continue  # Skip rows with invalid amounts

        parsed_rows.append(
            ParsedRow(
                row_index=row_index,
                external_id=external_id,
                date=date_str,
                category_value=category_value,
                account_value=account_value,
                amount=amount,
                description=description,
            )
        )

    if not parsed_rows:
        raise ValueError("No valid data rows found in file.")

    return parsed_rows


def analyze_mappings(
    db: Session, profile_id: UUID, parsed_rows: list[ParsedRow]
) -> ParseResult:
    """
    Analyze parsed rows and determine which values need mapping.

    Returns:
        ParseResult with unmapped values and existing mappings
    """
    # Collect distinct values
    category_values = set()
    account_values = set()

    for row in parsed_rows:
        if row.category_value:
            category_values.add(row.category_value)
        if row.account_value:
            account_values.add(row.account_value)

    # Get existing mappings
    existing_category_mappings = import_crud.get_value_mappings_dict(
        db, profile_id, "category"
    )
    existing_account_mappings = import_crud.get_value_mappings_dict(
        db, profile_id, "account"
    )

    # Convert UUIDs to strings for JSON serialization
    existing_cat_str = {k: str(v) for k, v in existing_category_mappings.items()}
    existing_acc_str = {k: str(v) for k, v in existing_account_mappings.items()}

    # Determine unmapped values
    unmapped_categories = [v for v in category_values if v not in existing_category_mappings]
    unmapped_accounts = [v for v in account_values if v not in existing_account_mappings]

    return ParseResult(
        profile_id=profile_id,
        total_rows=len(parsed_rows),
        parsed_rows=parsed_rows,
        unmapped_categories=sorted(unmapped_categories),
        unmapped_accounts=sorted(unmapped_accounts),
        existing_category_mappings=existing_cat_str,
        existing_account_mappings=existing_acc_str,
    )


def parse_date(date_str: str) -> datetime | None:
    """
    Parse a date string in various formats.
    Primary format: dd/MM/yyyy
    """
    formats = [
        "%d/%m/%Y",  # dd/MM/yyyy
        "%d-%m-%Y",  # dd-MM-yyyy
        "%Y-%m-%d",  # yyyy-MM-dd (ISO)
        "%m/%d/%Y",  # MM/dd/yyyy (US)
        "%d.%m.%Y",  # dd.MM.yyyy
    ]

    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue

    return None


def execute_import(
    db: Session,
    user_id: str,
    profile_id: UUID,
    parsed_rows: list[ParsedRow],
    category_mappings: list[MappingItem],
    account_mappings: list[MappingItem],
) -> ImportResult:
    """
    Execute the import: persist mappings and create transactions.

    Args:
        db: Database session
        user_id: User ID
        profile_id: Import profile ID
        parsed_rows: Rows to import
        category_mappings: New category mappings to persist
        account_mappings: New account mappings to persist

    Returns:
        ImportResult with counts and any errors
    """
    errors = []
    imported_count = 0
    skipped_count = 0

    # Persist new mappings
    if category_mappings:
        import_crud.create_value_mappings_batch(
            db, profile_id, category_mappings, "category"
        )
    if account_mappings:
        import_crud.create_value_mappings_batch(
            db, profile_id, account_mappings, "account"
        )

    # Build complete mapping lookups
    all_category_mappings = import_crud.get_value_mappings_dict(
        db, profile_id, "category"
    )
    all_account_mappings = import_crud.get_value_mappings_dict(
        db, profile_id, "account"
    )

    # Process each row
    for row in parsed_rows:
        try:
            # Parse date
            parsed_date = parse_date(row.date)
            if not parsed_date:
                errors.append(f"Row {row.row_index + 1}: Invalid date format '{row.date}'")
                skipped_count += 1
                continue

            # Resolve category
            category_id = all_category_mappings.get(row.category_value)
            if not category_id:
                errors.append(
                    f"Row {row.row_index + 1}: No mapping for category '{row.category_value}'"
                )
                skipped_count += 1
                continue

            # Resolve account
            account_id = all_account_mappings.get(row.account_value)
            if not account_id:
                errors.append(
                    f"Row {row.row_index + 1}: No mapping for account '{row.account_value}'"
                )
                skipped_count += 1
                continue

            # Determine transaction type from amount sign
            amount = row.amount
            if amount == 0:
                skipped_count += 1
                continue

            tx_type = "expense" if amount < 0 else "income"
            abs_amount = abs(amount)

            # Create transaction
            tx_data = TransactionCreate(
                date=parsed_date,
                type=tx_type,
                amount=abs_amount,
                category_id=category_id,
                account_id=account_id,
                description=row.description or f"Imported: {row.external_id}",
                tags=[],
            )

            transaction_crud.create_transaction(db, tx_data, user_id)
            imported_count += 1

        except Exception as e:
            errors.append(f"Row {row.row_index + 1}: {str(e)}")
            skipped_count += 1

    return ImportResult(
        imported_count=imported_count,
        skipped_count=skipped_count,
        errors=errors[:50],  # Limit errors to first 50
    )

