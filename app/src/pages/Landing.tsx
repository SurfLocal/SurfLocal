import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, Compass, ChevronRight, Users, Cloud } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoWithText from '@/assets/logo-with-text.png';
import tile1 from '@/assets/tiles/tile1.png';
import tile2 from '@/assets/tiles/tile2.png';
import tile3 from '@/assets/tiles/tile3.png';
import tile4 from '@/assets/tiles/tile4.png';
import tile5 from '@/assets/tiles/tile5.png';
import tile6 from '@/assets/tiles/tile6.png';
import tile7 from '@/assets/tiles/tile7.png';
import tile8 from '@/assets/tiles/tile8.png';
import tile9 from '@/assets/tiles/tile9.png';
import tile10 from '@/assets/tiles/tile10.png';

import { Brain, Satellite, MessageCircle } from 'lucide-react';

const features = [
  { icon: Users, title: 'Social Feed', description: 'Follow friends and see their sessions in real-time. Build your surf crew.' },
  { icon: Brain, title: 'AI Spot Reports', description: 'Smart forecasts trained on user feedback combined with live wind and swell data.' },
  { icon: Satellite, title: 'ML Spot Detection', description: 'Discover breaks using satellite imagery and bathymetry analysis around any GPS coordinate.' },
  { icon: MessageCircle, title: 'Community Reviews', description: 'Daily spot discussions to fact-check AI reports with real surfer insights.' },
];

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate('/feed');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src={logoWithText} alt="Salt" className="h-24 w-24 animate-pulse rounded-xl" />
      </div>
    );
  }

  
  return (
    <div className="h-full overflow-y-auto relative">
      {/* Fixed Full-Page Image Collage Background */}
      <div className="fixed inset-0 z-0 bg-white overflow-hidden">
        <div className="absolute inset-0 p-1 grid gap-1 grid-cols-4 grid-rows-[repeat(8,1fr)]">
          {/* Row 1: Large (2x2), small, tall (1x2) */}
          <div className="col-span-2 row-span-2 overflow-hidden rounded-sm">
            <img src={tile1} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-sm">
            <img src={tile2} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="row-span-2 overflow-hidden rounded-sm">
            <img src={tile3} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 2: small fills gap */}
          <div className="overflow-hidden rounded-sm">
            <img src={tile4} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 3: tall, wide (2x1), small */}
          <div className="row-span-2 overflow-hidden rounded-sm">
            <img src={tile5} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="col-span-2 overflow-hidden rounded-sm">
            <img src={tile6} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-sm">
            <img src={tile7} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 4: wide, tall */}
          <div className="col-span-2 overflow-hidden rounded-sm">
            <img src={tile8} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="row-span-2 overflow-hidden rounded-sm">
            <img src={tile9} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 5: Large (2x2), small */}
          <div className="col-span-2 row-span-2 overflow-hidden rounded-sm">
            <img src={tile10} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-sm">
            <img src={tile1} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 6: small, small fills gaps */}
          <div className="overflow-hidden rounded-sm">
            <img src={tile2} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="overflow-hidden rounded-sm">
            <img src={tile3} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 7: tall, wide, tall */}
          <div className="row-span-2 overflow-hidden rounded-sm">
            <img src={tile4} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="col-span-2 overflow-hidden rounded-sm">
            <img src={tile5} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="row-span-2 overflow-hidden rounded-sm">
            <img src={tile6} alt="" className="w-full h-full object-cover" />
          </div>
          {/* Row 8: wide fills remaining */}
          <div className="col-span-2 overflow-hidden rounded-sm">
            <img src={tile7} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-screen flex items-center">
          <div className="container mx-auto px-4 py-20">
            <div className="max-w-2xl mx-auto text-center">
              {/* Glass Card for Hero Content */}
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl">
                {/* Logo */}
                <div className="inline-flex items-center justify-center mb-6">
                  <img 
                    src={logoWithText} 
                    alt="Salt" 
                    className="h-32 w-32 md:h-40 md:w-40 rounded-2xl shadow-medium animate-float object-cover"
                  />
                </div>
                
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
                  Your personal surf companion. Track sessions, discover new breaks, 
                  connect with surfers, and build your surfing story.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/auth?mode=signup">
                    <Button size="xl" className="w-full sm:w-auto gap-2">
                      Get Started
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="outline" size="xl" className="w-full sm:w-auto bg-white/80 hover:bg-white">
                      Sign In
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
                Everything you need to surf smarter
              </h2>
              
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {features.map((feature, index) => (
                  <div key={index} className="bg-background/50 rounded-xl p-6 hover:bg-background transition-colors">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 md:p-12 shadow-xl text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">Ready to paddle out?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join surfers tracking sessions and connecting over their love of waves.
              </p>
              <Link to="/auth?mode=signup">
                <Button size="xl" className="gap-2">
                  Create Free Account
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8">
          <div className="container mx-auto px-4">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 text-center">
              <p className="text-muted-foreground">&copy; {new Date().getFullYear()} Salt. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
