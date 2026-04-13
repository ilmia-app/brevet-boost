import { Rocket } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl sprint-gradient mx-auto flex items-center justify-center">
          <Rocket className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold">Ton sprint est prêt ! 🚀</h1>
        <p className="text-muted-foreground">Le tableau de bord arrive bientôt.</p>
      </div>
    </div>
  );
};

export default Dashboard;
