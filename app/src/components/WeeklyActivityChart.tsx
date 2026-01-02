import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Waves } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

interface WeeklyActivityChartProps {
  userId: string;
}

interface DayData {
  day: string;
  waves: number;
  fullDate: Date;
}

const WeeklyActivityChart = ({ userId }: WeeklyActivityChartProps) => {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

      // Get all days of the week
      const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

      // Fetch sessions for this week
      const { data: sessions } = await supabase
        .from('sessions')
        .select('session_date, wave_count')
        .eq('user_id', userId)
        .eq('is_public', true)
        .gte('session_date', weekStart.toISOString())
        .lte('session_date', weekEnd.toISOString());

      // Aggregate waves by day
      const dayData = daysOfWeek.map(day => {
        const dayWaves = sessions
          ?.filter(s => isSameDay(new Date(s.session_date), day))
          .reduce((sum, s) => sum + (s.wave_count || 0), 0) || 0;

        return {
          day: format(day, 'EEE'),
          waves: dayWaves,
          fullDate: day,
        };
      });

      setData(dayData);
      setLoading(false);
    };

    if (userId) fetchWeeklyData();
  }, [userId]);

  const maxWaves = Math.max(...data.map(d => d.waves), 1);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Waves className="h-6 w-6 animate-pulse text-primary" />
        </CardContent>
      </Card>
    );
  }

  const totalWavesThisWeek = data.reduce((sum, d) => sum + d.waves, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Waves className="h-4 w-4 text-primary" />
            This Week
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalWavesThisWeek} waves
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-soft)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value} waves`, 'Waves']}
              />
              <Bar dataKey="waves" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.waves > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyActivityChart;
