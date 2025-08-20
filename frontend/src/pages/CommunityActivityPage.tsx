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
  const [activeSection, setActiveSection] = useState<string | null>(null);

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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div 
              className={`card shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                activeSection === 'active_readers' 
                  ? 'bg-primary text-primary-content ring-4 ring-primary ring-opacity-50' 
                  : 'bg-primary text-primary-content'
              }`}
              onClick={() => setActiveSection(activeSection === 'active_readers' ? null : 'active_readers')}
            >
              <div className="card-body">
                <div className="stat-figure">
                  <UserIcon className="w-8 h-8" />
                </div>
                <div className="stat-title">Active Readers</div>
                <div className="stat-value">{activity.active_readers || 0}</div>
                <div className="stat-desc">Sharing their activity</div>
              </div>
            </div>
            
            <div 
              className={`card shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                activeSection === 'books_this_month' 
                  ? 'bg-success text-success-content ring-4 ring-success ring-opacity-50' 
                  : 'bg-success text-success-content'
              }`}
              onClick={() => setActiveSection(activeSection === 'books_this_month' ? null : 'books_this_month')}
            >
              <div className="card-body">
                <div className="stat-figure">
                  <BookOpenIcon className="w-8 h-8" />
                </div>
                <div className="stat-title">Books This Month</div>
                <div className="stat-value">{activity.books_this_month || 0}</div>
                <div className="stat-desc">Finished by community</div>
              </div>
            </div>
            
            <div 
              className={`card shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                activeSection === 'currently_reading' 
                  ? 'bg-warning text-warning-content ring-4 ring-warning ring-opacity-50' 
                  : 'bg-warning text-warning-content'
              }`}
              onClick={() => setActiveSection(activeSection === 'currently_reading' ? null : 'currently_reading')}
            >
              <div className="card-body">
                <div className="stat-figure">
                  <ClockIcon className="w-8 h-8" />
                </div>
                <div className="stat-title">Currently Reading</div>
                <div className="stat-value">{activity.currently_reading || 0}</div>
                <div className="stat-desc">Active books</div>
              </div>
            </div>
            
            <div 
              className={`card shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                activeSection === 'recent_activity' 
                  ? 'bg-info text-info-content ring-4 ring-info ring-opacity-50' 
                  : 'bg-info text-info-content'
              }`}
              onClick={() => setActiveSection(activeSection === 'recent_activity' ? null : 'recent_activity')}
            >
              <div className="card-body">
                <div className="stat-figure">
                  <ChartBarIcon className="w-8 h-8" />
                </div>
                <div className="stat-title">Recent Activity</div>
                <div className="stat-value">{activity.recent_activity?.length || 0}</div>
                <div className="stat-desc">Reading sessions</div>
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          {activeSection && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                {activeSection === 'active_readers' && (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold mb-4">🔥 Active Readers</h3>
                    <p className="text-base-content/70 mb-4">Community members sharing their reading activity</p>
                    <Link to="/community/active-readers" className="btn btn-primary">
                      View Active Readers
                    </Link>
                  </div>
                )}
                
                {activeSection === 'books_this_month' && (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold mb-4">📚 Books This Month</h3>
                    <p className="text-base-content/70 mb-4">Books finished by community members this month</p>
                    <Link to="/community/books-this-month" className="btn btn-success">
                      View Books This Month
                    </Link>
                  </div>
                )}
                
                {activeSection === 'currently_reading' && (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold mb-4">📖 Currently Reading</h3>
                    <p className="text-base-content/70 mb-4">Books currently being read by community members</p>
                    <Link to="/community/currently-reading" className="btn btn-warning">
                      View Currently Reading
                    </Link>
                  </div>
                )}
                
                {activeSection === 'recent_activity' && (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-bold mb-4">📅 Recent Activity</h3>
                    <p className="text-base-content/70 mb-4">Recent reading activity from community members</p>
                    <Link to="/community/recent-activity" className="btn btn-info">
                      View Recent Activity
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
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
