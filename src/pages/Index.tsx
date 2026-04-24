import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [regEmail, setRegEmail] = useState("");
  const [regEmailConfirm, setRegEmailConfirm] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();
      navigate(data ? "/dashboard" : "/onboarding", { replace: true });
    })();
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error) {
      toast.error("Erreur", { description: error.message });
      setLoginLoading(false);
      return;
    }
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      const { data } = await supabase.from("users").select("id").eq("id", u.id).maybeSingle();
      navigate(data ? "/dashboard" : "/onboarding", { replace: true });
    }
    setLoginLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regEmail.trim().toLowerCase() !== regEmailConfirm.trim().toLowerCase()) {
      toast.error("Erreur", { description: "Les adresses email ne correspondent pas." });
      return;
    }
    if (regPassword !== regConfirm) {
      toast.error("Erreur", { description: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Erreur", { description: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    setRegLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Erreur", { description: error.message });
      setRegLoading(false);
      return;
    }
    setRegLoading(false);
    toast("Vérifie ta boîte mail 📩", {
      description: `Un email de confirmation a été envoyé à ${regEmail}. Clique sur le lien pour activer ton compte avant de te connecter.`,
      duration: 10000,
    });
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center shadow-lg">
            <Rocket className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Prépare ton brevet avec méthode</h1>
            <p className="text-muted-foreground text-sm">Le coach digital des élèves CNED</p>
          </div>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg">Se connecter</TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg">Créer mon compte</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Se connecter"}
              </Button>
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <Input
                type="email"
                placeholder="Confirme ton adresse email"
                value={regEmailConfirm}
                onChange={(e) => setRegEmailConfirm(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              {regEmailConfirm.length > 0 &&
                regEmail.trim().toLowerCase() !== regEmailConfirm.trim().toLowerCase() && (
                  <p className="text-sm text-destructive">Les adresses email ne correspondent pas.</p>
                )}
              <Input
                type="password"
                placeholder="Mot de passe"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <Input
                type="password"
                placeholder="Confirmer le mot de passe"
                value={regConfirm}
                onChange={(e) => setRegConfirm(e.target.value)}
                className="h-12 rounded-xl"
                required
              />
              <Button
                type="submit"
                disabled={regLoading}
                className="w-full h-12 sprint-gradient text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                {regLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Commencer mon sprint"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
