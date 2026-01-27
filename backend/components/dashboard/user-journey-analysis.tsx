'use client';

import { Card, Title, Text, Metric, Flex, ProgressBar, Badge, Grid, Col } from '@tremor/react';

interface HydrationStats {
  avg_score: number;
  sites_with_errors: number;
  total_errors: number;
}

interface NavigationStats {
  spa_count: number;
  total_client_routes: number;
}

interface Props {
  data: {
    hydration: HydrationStats;
    navigation: NavigationStats;
  } | null;
}

export function UserJourneyAnalysis({ data }: Props) {
  if (!data || !data.hydration || !data.navigation) {
    return (
      <Card className="h-full">
        <Title>User Journey Intelligence</Title>
        <Text>Waiting for Phase 3 data (v3.5.0+)</Text>
      </Card>
    );
  }

  const { hydration, navigation } = data;
  const avgScore = Math.round(Number(hydration.avg_score) || 100);
  
  return (
    <Card className="h-full">
      <Flex alignItems="start" className="mb-4">
        <div>
          <Title>User Journey Intelligence 🧠</Title>
          <Text>Hydration health & SPA navigation metrics</Text>
        </div>
        <Badge size="xs" color="violet">Phase 3</Badge>
      </Flex>

      <Grid numItems={1} numItemsSm={2} className="gap-6">
        
        {/* Hydration Section */}
        <Col>
          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
              <Text className="font-bold text-orange-900 dark:text-orange-100">Hydration Health</Text>
              <Badge color={avgScore > 90 ? "emerald" : avgScore > 70 ? "yellow" : "rose"}>
                Score: {avgScore}
              </Badge>
            </Flex>
            
            <Metric className="text-orange-600 dark:text-orange-400">
              {Number(hydration.total_errors) || 0}
            </Metric>
            <Text className="text-xs text-orange-700/70 dark:text-orange-300/70">
              Total hydration errors detected
            </Text>

            <div className="mt-4">
              <Flex justifyContent="between" className="mb-1">
                <Text className="text-xs">Avg Score</Text>
                <Text className="text-xs font-medium">{avgScore}/100</Text>
              </Flex>
              <ProgressBar value={avgScore} color={avgScore > 90 ? "emerald" : "orange"} className="mt-2" />
            </div>
            
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800/50">
               <Text className="text-xs">
                 <strong>{Number(hydration.sites_with_errors) || 0} sites</strong> failed hydration check
               </Text>
            </div>
          </div>
        </Col>

        {/* Navigation Section */}
        <Col>
          <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50">
            <Flex justifyContent="between" alignItems="center" className="mb-2">
              <Text className="font-bold text-sky-900 dark:text-sky-100">SPA Intelligence</Text>
              <Badge color="blue">Navigation</Badge>
            </Flex>
            
            <Metric className="text-sky-600 dark:text-sky-400">
              {Number(navigation.total_client_routes) || 0}
            </Metric>
            <Text className="text-xs text-sky-700/70 dark:text-sky-300/70">
              Client-side route transitions tracked
            </Text>

            <div className="mt-4 pt-4 border-t border-sky-200 dark:border-sky-800/50">
               <Flex justifyContent="start" alignItems="baseline" className="gap-2">
                 <Text className="text-2xl font-bold text-sky-700 dark:text-sky-300">
                   {Number(navigation.spa_count) || 0}
                 </Text>
                 <Text className="text-sm text-sky-600 dark:text-sky-400">
                   Single Page Applications detected
                 </Text>
               </Flex>
            </div>

            <div className="mt-3">
              <Text className="text-xs italic text-sky-600/80">
                "Soft navigations are smoother than full reloads"
              </Text>
            </div>
          </div>
        </Col>

      </Grid>
    </Card>
  );
}
