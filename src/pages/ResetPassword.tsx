import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery token from the URL hash and emits
    // a PASSWORD_RECOVERY event. We allow the form once a session exists.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mot de passe mis à jour", description: "Tu peux maintenant te connecter." });
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
            <Rocket className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
            <p className="text-muted-foreground text-sm">
              Choisis un nouveau mot de passe pour ton compte.
            </p>
          </div>
        </div>

        {ready ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
            <Input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 rounded-xl"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Mettre à jour"}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p>Vérification du lien de réinitialisation...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
