import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { ReadingLog, User } from '@/types';
import { 
  BookOpenIcon,
  UserIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface ReadingLogWithUser extends ReadingLog {
  user: User;
  book: {
    id: number;
    uid: string;
    title: string;
    author: string;
    cover_url?: string;
  };
}

const RecentActivityPage: React.FC = () => {
  const [recentLogs, setRecentLogs] = useState<ReadingLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await api.community.getRecentActivity();
        
        if (response.success && response.data) {
          setRecentLogs(response.data);
        } else {
          setError('Failed to load recent activity');
        }
      } catch (err) {
        setError('Failed to load recent activity');
        console.error('Recent activity fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">📅 Recent Activity</h1>
          <p className="text-base-content/70 mt-1">Loading recent activity...</p>
        </div>
        
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="card bg-base-100 shadow-xl animate-pulse">
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-base-300 rounded-lg"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-base-300 rounded mb-2"></div>
                    <div className="h-3 bg-base-300 rounded mb-2"></div>
                    <div className="h-3 bg-base-300 rounded w-2/3"></div>
                  </div>
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
          <h1 className="text-3xl font-bold text-base-content">📅 Recent Activity</h1>
          <p className="text-base-content/70 mt-1">Recent reading activity from community members</p>
        </div>
        
        <div className="bg-base-100 border-2 border-error/20 rounded-2xl p-8 shadow-lg text-center">
          <h2 className="text-2xl font-bold text-error mb-4">Failed to Load Recent Activity</h2>
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
        <h1 className="text-3xl font-bold text-base-content">📅 Recent Activity</h1>
        <p className="text-base-content/70 mt-1">Recent reading activity from community members</p>
      </div>

      {recentLogs.length > 0 ? (
        <div className="space-y-4">
          {recentLogs.map((log) => (
            <div key={log.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    {log.book.cover_url ? (
                      <img 
                        src={log.book.cover_url} 
                        alt={`Cover of ${log.book.title}`}
                        className="w-16 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-base-300 rounded-lg flex items-center justify-center">
                        <BookOpenIcon className="w-8 h-8 text-base-content/40" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-4 h-4 text-base-content/60" />
                      <Link 
                        to={`/user/${log.user.id}`}
                        className="text-sm text-primary hover:text-primary-focus transition-colors font-medium"
                      >
                        {log.user.username}
                      </Link>
                      <span className="text-base-content/60">read</span>
                      <span className="font-semibold text-primary">{log.pages_read} pages</span>
                      <span className="text-base-content/60">of</span>
                    </div>
                    
                    <Link 
                      to={`/book/${log.book.uid}`}
                      className="text-lg font-bold text-base-content hover:text-primary transition-colors"
                    >
                      {log.book.title}
                    </Link>
                    
                    <p className="text-base-content/70 text-sm mb-2">by {log.book.author}</p>
                    
                    <div className="flex items-center gap-2 text-sm text-base-content/60">
                      <CalendarIcon className="w-4 h-4" />
                      <span>
                        {new Date(log.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Link 
                      to={`/book/${log.book.uid}`}
                      className="btn btn-primary btn-sm"
                    >
                      View Book
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold text-base-content mb-2">No Recent Activity</h3>
            <p className="text-base-content/70 mb-6">
              No recent reading activity from community members. Start logging your reading!
            </p>
            <Link to="/add-book" className="btn btn-primary">
              <BookOpenIcon className="w-4 h-4 mr-2" />
              Add Your First Book
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivityPage;
