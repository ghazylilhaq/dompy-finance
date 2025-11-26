import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <SignIn
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
