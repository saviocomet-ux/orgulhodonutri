import { motion } from "framer-motion";
import { 
  Users, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  CheckCircle2, 
  ArrowRight, 
  Droplets, 
  BrainCircuit,
  PieChart,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const Landing = ({ onGetStarted, onLogin }: LandingProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">NutriTrack</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onLogin}>Entrar</Button>
            <Button onClick={onGetStarted}>Começar Agora</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <BrainCircuit className="h-4 w-4" />
              Prescrição Inteligente com IA
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
              Sua clínica de <span className="text-primary italic">Nutrição</span> mais eficiente.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              A plataforma completa para nutricionistas que querem escalar seus resultados com inteligência artificial.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="h-14 px-8 text-lg gap-2" onClick={onGetStarted}>
                Criar contagratuita <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg" onClick={onLogin}>
                Acessar minha conta
              </Button>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[100px] -z-10 rounded-full" />
            <img 
              src="/assets/hero.png" 
              alt="Dashboard" 
              className="rounded-2xl border shadow-2xl relative z-10 w-full"
            />
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-12 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Nutricionistas", value: "500+" },
            { label: "Pacientes Ativos", value: "10k+" },
            { label: "Refeições Logadas", value: "1M+" },
            { label: "Satisfação", value: "99%" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For Nutritionists */}
      <section className="py-24 px-4 bg-muted/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-4">Feito para Nutricionistas</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tudo que você precisa para gérer sua clínica em um único lugar. Sem planilhas, sem retrabalho.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="h-8 w-8 text-orange-500" />}
              title="Gestão Inteligente"
              description="Acompanhe o progresso de todos os pacientes em tempo real, sem perder tempo com planilhas."
            />
            <FeatureCard 
              icon={<BrainCircuit className="h-8 w-8 text-purple-500" />}
              title="IA que Trabalha por Você"
              description="Gere planos alimentares e ajustes calóricos automatcheck com análise de dados em segundos."
            />
            <FeatureCard 
              icon={<ShieldCheck className="h-8 w-8 text-green-500" />}
              title="Dados Seguros"
              description="Privacidade garantida com criptografia de nível bancário."
            />
          </div>
        </div>
      </section>

      {/* For Patients / Mobile */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <img 
              src="/assets/mobile.png" 
              alt="Paciente App" 
              className="w-full max-w-sm mx-auto drop-shadow-2xl"
            />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Encante seus Pacientes</h2>
            <p className="text-xl text-muted-foreground mb-10">
              Ofereça uma experiência moderna. Seu paciente recebe o plano alimentar no celular, registra a água e as refeições com fotos.
            </p>
            <div className="space-y-6">
              <BenefitItem 
                icon={<Smartphone />}
                title="App Exclusivo"
                text="Acesso direto ao cardápio e orientações."
              />
              <BenefitItem 
                icon={<Droplets />}
                title="Log de Hidratação"
                text="Lembretes e acompanhamento real de água."
              />
              <BenefitItem 
                icon={<Target />}
                title="Metas Diárias"
                text="Gamificação para manter o paciente focado."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-muted/20" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos Simples e Transparentes</h2>
            <p className="text-muted-foreground">Escolha o plano ideal para o momento da sua carreira.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Basic Plan */}
            <Card className="p-8 relative overflow-hidden flex flex-col items-center">
              <div className="mb-4 p-3 rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Básico</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ 39,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 w-full">
                <PricingItem text="Até 30 pacientes" />
                <PricingItem text="Dashboard completo" />
                <PricingItem text="App para pacientes" />
                <PricingItem text="Suporte por e-mail" />
              </ul>
              <Button size="lg" variant="outline" className="w-full" onClick={onGetStarted}>Começar Agora</Button>
            </Card>

            {/* Premium Plan */}
            <Card className="p-8 relative overflow-hidden border-primary shadow-xl border-2 flex flex-col items-center">
              <div className="absolute top-4 right-4 px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded">MAIS POPULAR</div>
              <div className="mb-4 p-3 rounded-full bg-primary/20">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Profissional</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">R$ 59,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1 w-full">
                <PricingItem text="Pacientes ilimitados" />
                <PricingItem text="Acesso completo à IA" />
                <PricingItem text="Análise de macros" />
                <PricingItem text="Suporte prioritário" />
                <PricingItem text="Marca personalizada" />
              </ul>
              <Button size="lg" className="w-full" onClick={onGetStarted}>Escolher Plano Profissional</Button>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-24 px-4 bg-primary text-primary-foreground text-center">
        <h2 className="text-4xl font-bold mb-6">Pronto para levar sua clínica a outro nível?</h2>
        <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
          Junte-se a +500 nutricionistas que já usam a NutriTrack para crescer seus consultórios.
        </p>
        <Button size="lg" variant="secondary" className="h-16 px-10 text-xl font-bold rounded-full" onClick={onGetStarted}>
          Começar gratuito
        </Button>
      </section>

      <footer className="py-12 border-t px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="font-bold">NutriTrack</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 NutriTrack. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: any; title: string; description: string }) => (
  <Card className="p-6 bg-card border-none shadow-lg hover:shadow-xl transition-shadow">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </Card>
);

const BenefitItem = ({ icon, title, text }: { icon: any; title: string; text: string }) => (
  <div className="flex items-start gap-4">
    <div className="p-2 rounded-lg bg-primary/10 text-primary">
      {icon}
    </div>
    <div>
      <h4 className="font-bold">{title}</h4>
      <p className="text-muted-foreground">{text}</p>
    </div>
  </div>
);

const PricingItem = ({ text }: { text: string }) => (
  <li className="flex items-center gap-2">
    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
    <span className="text-sm">{text}</span>
  </li>
);

export default Landing;
