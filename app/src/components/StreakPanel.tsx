import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';
import { format, differenceInDays, parseISO, startOfDay } from 'date-fns';

interface StreakPanelProps {
  userId: string;
  onStreakUpdated?: (longestStreak: number, streakStart: string | null) => void;
  onStreakCalculated?: (currentStreak: number, longestStreak: number) => void;
}

const StreakPanel = ({ userId, onStreakUpdated, onStreakCalculated }: StreakPanelProps) => {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateStreak = async () => {
      if (!userId) return;

      // Fetch all session dates for the user, ordered by date descending
      const { data: sessions } = await supabase
        .from('sessions')
        .select('session_date')
        .eq('user_id', userId)
        .order('session_date', { ascending: false });

      if (!sessions || sessions.length === 0) {
        setCurrentStreak(0);
        setLoading(false);
        return;
      }

      // Get unique dates (a user might have multiple sessions per day)
      const uniqueDates = [...new Set(sessions.map(s => s.session_date))].map(d => startOfDay(parseISO(d)));
      uniqueDates.sort((a, b) => b.getTime() - a.getTime()); // Most recent first

      const today = startOfDay(new Date());
      let streak = 0;
      let checkDate = today;

      // Check if the most recent session is today or yesterday
      const mostRecentDate = uniqueDates[0];
      const daysSinceLast = differenceInDays(today, mostRecentDate);

      // If most recent session is more than 1 day ago, streak is broken
      if (daysSinceLast > 1) {
        setCurrentStreak(0);
        setLoading(false);
        return;
      }

      // Start from the most recent session date
      checkDate = mostRecentDate;
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const sessionDate = uniqueDates[i];
        const expectedDate = new Date(checkDate);
        expectedDate.setDate(expectedDate.getDate() - (i === 0 ? 0 : 1));
        
        const diff = differenceInDays(checkDate, sessionDate);
        
        if (i === 0) {
          streak = 1;
          checkDate = sessionDate;
        } else if (diff === 1) {
          streak++;
          checkDate = sessionDate;
        } else if (diff === 0) {
          // Same day, continue
          continue;
        } else {
          // Gap found, streak is broken
          break;
        }
      }

      // A streak needs at least 2 days
      const finalStreak = streak >= 2 ? streak : 0;
      setCurrentStreak(finalStreak);

      // Fetch profile to get or compare longest streak
      const { data: profile } = await supabase
        .from('profiles')
        .select('longest_streak, longest_streak_start')
        .eq('user_id', userId)
        .maybeSingle();

      // Calculate the actual longest streak (max of stored and current)
      const storedLongest = profile?.longest_streak || 0;
      const actualLongest = Math.max(storedLongest, finalStreak);
      setLongestStreak(actualLongest);

      // Notify parent of calculated values
      onStreakCalculated?.(finalStreak, actualLongest);

      // Only try to update if current streak beats stored AND we're viewing our own profile
      // (RLS will block updates to other users' profiles anyway)
      if (profile && finalStreak > storedLongest) {
        // Calculate when this streak started
        const streakStartDate = new Date(uniqueDates[0]);
        streakStartDate.setDate(streakStartDate.getDate() - (finalStreak - 1));
        const formattedDate = format(streakStartDate, 'yyyy-MM-dd');
        
        const { error } = await supabase
          .from('profiles')
          .update({
            longest_streak: finalStreak,
            longest_streak_start: formattedDate,
          })
          .eq('user_id', userId);

        // Only notify if update succeeded (user viewing own profile)
        if (!error) {
          onStreakUpdated?.(finalStreak, formattedDate);
        }
      }

      setLoading(false);
    };

    calculateStreak();
  }, [userId, onStreakUpdated, onStreakCalculated]);

  if (loading) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 animate-pulse">
        <div className="h-10 bg-muted rounded"></div>
      </div>
    );
  }

  const isOnStreak = currentStreak >= 2;

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isOnStreak ? 'bg-orange-500/20' : 'bg-muted'}`}>
          <Flame 
            className={`h-6 w-6 transition-colors ${isOnStreak ? 'text-orange-500' : 'text-muted-foreground/40'}`}
          />
        </div>
        <div>
          <p className={`text-2xl font-bold ${isOnStreak ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {currentStreak}
          </p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </div>
      </div>
    </div>
  );
};

export default StreakPanel;
