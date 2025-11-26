import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function LandingPage() {
  const { userId } = await auth();

  if (userId) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="w-full py-6 px-6 md:px-12 flex justify-between items-center border-b-2 border-border bg-secondary-background">
        <div className="font-heading font-bold text-2xl">Dompy</div>
        <div className="flex gap-4">
          <Link href="/sign-in">
            <Button variant="neutral">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight">
            Master Your Money with <span className="text-main underline decoration-4 decoration-accent underline-offset-4">Style</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            A neobrutalist personal finance tracker that makes budgeting bold, simple, and effective.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/sign-up">
              <Button size="lg" className="text-lg px-8 h-14 shadow-shadow hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                Start Budgeting Now <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="neutral" size="lg" className="text-lg px-8 h-14">
                I have an account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-secondary-background border-t-2 border-border py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 border-2 border-border rounded-base shadow-shadow bg-background">
            <div className="h-12 w-12 bg-chart-1-green rounded-full border-2 border-border flex items-center justify-center mb-6">
              <CheckCircle2 className="h-6 w-6 text-black" />
            </div>
            <h3 className="font-heading font-bold text-2xl mb-4">Simple Tracking</h3>
            <p className="text-muted-foreground text-lg">
              Log income and expenses in seconds. No clutter, just clarity.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 border-2 border-border rounded-base shadow-shadow bg-background">
            <div className="h-12 w-12 bg-chart-2-blue rounded-full border-2 border-border flex items-center justify-center mb-6">
              <CheckCircle2 className="h-6 w-6 text-black" />
            </div>
            <h3 className="font-heading font-bold text-2xl mb-4">Smart Budgets</h3>
            <p className="text-muted-foreground text-lg">
              Set limits for categories and stay on top of your spending habits.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 border-2 border-border rounded-base shadow-shadow bg-background">
            <div className="h-12 w-12 bg-chart-3-purple rounded-full border-2 border-border flex items-center justify-center mb-6">
              <CheckCircle2 className="h-6 w-6 text-black" />
            </div>
            <h3 className="font-heading font-bold text-2xl mb-4">Visual Insights</h3>
            <p className="text-muted-foreground text-lg">
              Beautiful charts and stats that make financial health easy to understand.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t-2 border-border text-center bg-main text-main-foreground">
        <p className="font-bold">© {new Date().getFullYear()} Dompy. All rights reserved.</p>
      </footer>
    </main>
  );
}
