import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { CommunityActivity, ReadingLog } from '@/types';
import { 
  FireIcon,
  BookOpenIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const CommunityActivityPage: React.FC = () => {
  const [activity, setActivity] = useState<CommunityActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunityActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.community.getActivity();
        
        if (response.success && response.data) {
          setActivity(response.data);
        } else {
          setError('Failed to load community activity');
        }
      } catch (err) {
        setError('Failed to load community activity');
        console.error('Community activity fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunityActivity();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">👥 Community Activity</h1>
          <p className="text-base-content/70 mt-1">Loading community activity...</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="h-6 bg-base-300 rounded mb-4"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg">
                      <div className="w-12 h-16 bg-base-300 rounded-lg"></div>
                      <div className="flex-grow">
                        <div className="h-4 bg-base-300 rounded mb-2"></div>
                        <div className="h-3 bg-base-300 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">👥 Community Activity</h1>
          <p className="text-base-content/70 mt-1">See what others are reading</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Community Activity</h2>
          <p className="text-base-content/70 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-outline btn-error"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-base-content">👥 Community Activity</h1>
        <p className="text-base-content/70 mt-1">See what others are reading</p>
      </div>

      {/* Community Statistics */}
      {activity && (
        <div className="stats shadow bg-base-100">
          <div className="stat">
            <div className="stat-figure text-primary">
              <UserIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Active Readers</div>
            <div className="stat-value text-primary">{activity.active_readers || 0}</div>
            <div className="stat-desc">Sharing their activity</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-success">
              <BookOpenIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Books This Month</div>
            <div className="stat-value text-success">{activity.books_this_month || 0}</div>
            <div className="stat-desc">Finished by community</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-warning">
              <ClockIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Currently Reading</div>
            <div className="stat-value text-warning">{activity.currently_reading || 0}</div>
            <div className="stat-desc">Active books</div>
          </div>
          
          <div className="stat">
            <div className="stat-figure text-info">
              <ChartBarIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Recent Activity</div>
            <div className="stat-value text-info">{activity.recent_activity?.length || 0}</div>
            <div className="stat-desc">Reading sessions</div>
          </div>
        </div>
      )}

      {/* Recent Reading Activity */}
      {activity?.recent_activity && activity.recent_activity.length > 0 && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-primary mb-6">
              <FireIcon className="w-6 h-6" />
              Recent Reading Activity
            </h2>
            
            <div className="space-y-4">
              {activity.recent_activity.slice(0, 15).map((log: ReadingLog, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary text-primary-content rounded-full flex items-center justify-center">
                      <BookOpenIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold">Reading Session</span>
                      <p className="text-sm text-base-content/70">
                        {log.pages_read} pages read
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-base-content/60">
                      {log.date && new Date(log.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!activity || !activity.recent_activity?.length) && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="mb-6">
              <span className="text-6xl">👥</span>
            </div>
            <h2 className="text-2xl font-bold mb-3">No Community Activity</h2>
            <p className="text-base-content/70 mb-6">
              The community is quiet right now. Be the first to share your reading activity!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/add-book" className="btn btn-primary">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Add a Book
              </Link>
              <Link to="/public-library" className="btn btn-outline">
                <BookOpenIcon className="w-5 h-5 mr-2" />
                Browse Public Library
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityActivityPage;
