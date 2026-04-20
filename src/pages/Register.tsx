import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Loader2, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Compte créé !", description: "Vérifie ta boîte mail pour confirmer." });
    setEmailSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {emailSent ? (
          <>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
                <Mail className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold">Vérifie ta boîte mail</h1>
              <p className="text-muted-foreground text-sm">
                Un email de confirmation t'a été envoyé. Clique sur le lien dans l'email pour activer ton compte et commencer ton sprint.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Tu n'as pas reçu l'email ? Vérifie tes spams ou contacte-nous.
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              J'ai confirmé mon email
            </Button>
          </>
        ) : (
        <>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
            <Rocket className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Crée ton compte</h1>
          <p className="text-muted-foreground text-sm">Inscris-toi pour commencer ton sprint brevet</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 rounded-xl"
            required
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Continuer"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
        </>
        )}
      </div>
    </div>
  );
};

export default Register;
