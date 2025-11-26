import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-main hover:bg-main/90 text-main-foreground border-2 border-border shadow-shadow",
            card: "border-2 border-border shadow-shadow bg-secondary-background",
            headerTitle: "font-heading",
            headerSubtitle: "text-muted-foreground",
          },
        }}
      />
    </div>
  );
}
