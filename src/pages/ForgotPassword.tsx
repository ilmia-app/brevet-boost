import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
            {sent ? (
              <MailCheck className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Rocket className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {sent ? "Vérifie ta boîte mail" : "Mot de passe oublié ?"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {sent
                ? "Si un compte existe avec cet email, tu recevras un lien pour réinitialiser ton mot de passe."
                : "Saisis ton email pour recevoir un lien de réinitialisation."}
            </p>
          </div>
        </div>

        {!sent && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Envoyer le lien"}
            </Button>
          </form>
        )}

        <Link
          to="/"
          className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
