import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
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

      try {
        // Fetch all sessions for the user
        const sessions = await api.sessions.getByUser(userId);

        if (!sessions || sessions.length === 0) {
          setCurrentStreak(0);
          setLoading(false);
          return;
        }

        // Sort by date descending
        const sortedSessions = [...sessions].sort((a: any, b: any) => 
          new Date(b.session_date).getTime() - new Date(a.session_date).getTime()
        );

        // Get unique dates (a user might have multiple sessions per day)
        const uniqueDates = [...new Set(sortedSessions.map((s: any) => s.session_date))].map(d => startOfDay(parseISO(d as string)));
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
        const profile = await api.profiles.getByUserId(userId);

        // Calculate the actual longest streak (max of stored and current)
        const storedLongest = profile?.longest_streak || 0;
        const actualLongest = Math.max(storedLongest, finalStreak);
        setLongestStreak(actualLongest);

        // Notify parent of calculated values
        onStreakCalculated?.(finalStreak, actualLongest);

        // Only try to update if current streak beats stored
        if (profile?.id && finalStreak > storedLongest) {
          // Calculate when this streak started
          const streakStartDate = new Date(uniqueDates[0]);
          streakStartDate.setDate(streakStartDate.getDate() - (finalStreak - 1));
          const formattedDate = format(streakStartDate, 'yyyy-MM-dd');
          
          try {
            await api.profiles.update(profile.id, {
              longest_streak: finalStreak,
              longest_streak_start: formattedDate,
            });
            onStreakUpdated?.(finalStreak, formattedDate);
          } catch (updateError) {
            // Update failed, likely viewing someone else's profile
            console.error('Could not update streak:', updateError);
          }
        }
      } catch (error) {
        console.error('Error calculating streak:', error);
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
