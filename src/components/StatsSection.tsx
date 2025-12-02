import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

const StatsSection = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDestinations: 0,
    totalPosts: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 🧭 Get destinations count
        const { count: destCount } = await supabase
          .from("destinations")
          .select("*", { count: "exact", head: true })
           .eq('status', 'approved');

        // 👥 Get users count
        const { count: usersCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // 🧾 Get posts count
        const { count: postsCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true });

        setStats({
          totalUsers: usersCount || 0,
          totalDestinations: destCount || 0,
          totalPosts: postsCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: "🌿",
      number: stats.totalDestinations.toLocaleString(),
      label: "Destinations",
    },
    {
      icon: "👥",
      number: stats.totalUsers.toLocaleString(),
      label: "Active Eco-Travelers",
    },
    {
      icon: "💬",
      number: stats.totalPosts.toLocaleString(),
      label: "Community Posts",
    },
    // You can add more stat items here and they will remain centered
  ];

  return (
    <section className="py-20 bg-forest">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Making a Real Impact
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Together, we're building a more sustainable future for tourism in the Philippines.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          // --- CHANGE IS HERE ---
          <div className="flex flex-wrap justify-center gap-6">
            {statItems.map((stat, i) => (
              <Card
                key={i}
                // Optional: You can add widths here to control how many cards appear per row
                // For example: className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4 ..."
                className="bg-white/10 backdrop-blur-sm border-white/20 text-center hover:bg-white/20 transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{stat.icon}</div>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                    {stat.number}
                  </div>
                  <div className="text-white/80 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default StatsSection;
