import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Building2, Zap, MessageSquare, BarChart3, Shield } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">Sy</span>
            </div>
            Sponsorly
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="rounded-pill">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="gradient-primary text-white border-0 rounded-pill">
                Registrarse <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-14 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>
        <div className="container relative z-10 py-24 md:py-32">
          <div className="max-w-2xl animate-slide-up">
            <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">Conectar marcas, crear momentos.</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight">
              Conecta tus eventos con los sponsors perfectos
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              El marketplace donde organizadores de eventos encuentran patrocinadores ideales.
              Match inteligente, comunicación directa, resultados reales.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-white border-0 rounded-pill h-12 px-8 font-semibold">
                  Empezar gratis <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link to="/auth?mode=signup">
                <Button size="lg" variant="outline" className="rounded-pill h-12 px-8">
                  Soy sponsor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl font-bold">Todo lo que necesitas</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Herramientas diseñadas para simplificar la conexión entre eventos y marcas
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: CalendarDays,
              title: "Publica eventos",
              desc: "Crea y gestiona tus eventos con toda la información que sponsors necesitan ver.",
            },
            {
              icon: Building2,
              title: "Descubre sponsors",
              desc: "Busca por industria, presupuesto, tipo de activación y más.",
            },
            {
              icon: Zap,
              title: "Match inteligente",
              desc: "Algoritmo que calcula compatibilidad entre evento y sponsor automáticamente.",
            },
            {
              icon: MessageSquare,
              title: "Chat directo",
              desc: "Conversaciones en tiempo real ligadas a eventos específicos.",
            },
            {
              icon: BarChart3,
              title: "Métricas claras",
              desc: "Presupuestos, capacidad, audiencia — toda la data en un vistazo.",
            },
            {
              icon: Shield,
              title: "Seguro y real",
              desc: "Datos reales, perfiles verificables, sin información ficticia.",
            },
          ].map((feature, i) => (
            <div
              key={feature.title}
              className="bg-card rounded-2xl p-6 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${0.08 * i}s`, animationFillMode: "both" }}
            >
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="gradient-primary rounded-2xl p-10 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ lineHeight: '1.1' }}>
              Empieza a conectar hoy
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Crea tu cuenta gratuita y descubre oportunidades de patrocinio en minutos.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="bg-white text-foreground hover:bg-white/90 rounded-pill h-12 px-8 font-semibold">
                Crear cuenta gratis <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
          <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md gradient-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">Sy</span>
            </div>
            Sponsorly
          </div>
          <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
