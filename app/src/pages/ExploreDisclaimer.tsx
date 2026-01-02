import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Waves, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

const ExploreDisclaimer = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout allowScroll>
      <div className="flex items-center justify-center min-h-full p-4">
        <div className="max-w-lg w-full">
          <div className="bg-card rounded-2xl shadow-medium p-8 text-center">
            {/* Warning Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium mb-4">
              <AlertTriangle className="h-3.5 w-3.5" />
              Beta Feature
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Surf Analysis Explorer
            </h1>

            {/* Description */}
            <div className="space-y-4 text-muted-foreground text-sm mb-8">
              <p>
                This tool uses <span className="text-foreground font-medium">satellite imagery</span> and{' '}
                <span className="text-foreground font-medium">ocean bathymetry data</span> to predict whether 
                a location is potentially surfable under ideal conditions.
              </p>
              
              <p>
                The analysis <span className="text-amber-600 font-medium">estimates ideal swell and wind conditions</span> for 
                the selected spot — it does <span className="text-foreground font-medium">not</span> reflect current conditions.
              </p>

              <p>
                All percentages shown are <span className="text-foreground font-medium">confidence scores</span> for 
                the AI predictions, not guarantees of accuracy.
              </p>
            </div>

            {/* Important Notice */}
            <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Important:</span> Always verify conditions 
                through reliable surf forecasts and local knowledge before surfing at any location. 
                This tool is for exploration purposes only.
              </p>
            </div>

            {/* Continue Button */}
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/explore')}
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ExploreDisclaimer;
