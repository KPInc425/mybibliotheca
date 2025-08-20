"""
UserService - Core business logic for user operations
Extracted from Flask routes to enable API-first architecture
"""

from typing import Optional, Dict, List, Any
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models import User, Book, ReadingLog, SystemSettings, db
from ..utils import calculate_reading_streak


class UserNotFoundError(Exception):
    """Raised when a user is not found"""
    pass


class UserService:
    """Service class for user-related operations"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User ID
            
        Returns:
            User object or None if not found
        """
        return User.query.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username
        
        Args:
            username: Username
            
        Returns:
            User object or None if not found
        """
        return User.query.filter_by(username=username).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email
        
        Args:
            email: Email address
            
        Returns:
            User object or None if not found
        """
        return User.query.filter(User.email.ilike(email)).first()
    
    def create_user(self, username: str, email: str, password: str, is_admin: bool = False) -> User:
        """
        Create a new user
        
        Args:
            username: Username
            email: Email address
            password: Password
            is_admin: Whether user is admin
            
        Returns:
            Created User object
        """
        # Check if username or email already exists
        if self.get_user_by_username(username):
            raise ValueError(f"Username '{username}' already exists")
        
        if self.get_user_by_email(email):
            raise ValueError(f"Email '{email}' already exists")
        
        user = User(
            username=username,
            email=email,
            is_admin=is_admin
        )
        user.set_password(password)
        
        self.db.add(user)
        self.db.commit()
        
        return user
    
    def update_user_profile(self, user_id: int, profile_data: Dict[str, Any]) -> User:
        """
        Update user profile
        
        Args:
            user_id: User ID
            profile_data: Profile data to update
            
        Returns:
            Updated User object
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Update allowed fields
        if 'username' in profile_data:
            existing_user = self.get_user_by_username(profile_data['username'])
            if existing_user and existing_user.id != user_id:
                raise ValueError(f"Username '{profile_data['username']}' already exists")
            user.username = profile_data['username']
        
        if 'email' in profile_data:
            existing_user = self.get_user_by_email(profile_data['email'])
            if existing_user and existing_user.id != user_id:
                raise ValueError(f"Email '{profile_data['email']}' already exists")
            user.email = profile_data['email']
        
        if 'share_current_reading' in profile_data:
            user.share_current_reading = profile_data['share_current_reading']
        
        if 'share_reading_activity' in profile_data:
            user.share_reading_activity = profile_data['share_reading_activity']
        
        if 'share_library' in profile_data:
            user.share_library = profile_data['share_library']
        
        if 'debug_enabled' in profile_data:
            user.debug_enabled = profile_data['debug_enabled']
        
        self.db.commit()
        return user
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """
        Change user password
        
        Args:
            user_id: User ID
            current_password: Current password
            new_password: New password
            
        Returns:
            True if password changed successfully
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        if not user.check_password(current_password):
            return False
        
        user.set_password(new_password)
        self.db.commit()
        return True
    
    def get_user_statistics(self, user_id: int) -> Dict[str, Any]:
        """
        Get user reading statistics
        
        Args:
            user_id: User ID
            
        Returns:
            Dictionary with user statistics
        """
        user = self.get_user_by_id(user_id)
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Get all books
        all_books = Book.query.filter_by(user_id=user_id).all()
        
        # Calculate statistics
        total_books = len(all_books)
        finished_books = len([b for b in all_books if b.finish_date])
        currently_reading = len([b for b in all_books if not b.finish_date and not b.want_to_read and not b.library_only])
        want_to_read = len([b for b in all_books if b.want_to_read])
        
        # Get reading streak
        reading_streak = calculate_reading_streak(user_id, user.reading_streak_offset)
        
        # Get recent activity
        recent_logs = ReadingLog.query.filter_by(user_id=user_id)\
            .order_by(desc(ReadingLog.date))\
            .limit(10)\
            .all()
        
        # Get monthly reading data
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        monthly_pages = ReadingLog.query.filter_by(user_id=user_id)\
            .filter(func.extract('month', ReadingLog.date) == current_month)\
            .filter(func.extract('year', ReadingLog.date) == current_year)\
            .with_entities(func.sum(ReadingLog.pages_read))\
            .scalar() or 0
        
        return {
            'total_books': total_books,
            'finished_books': finished_books,
            'currently_reading': currently_reading,
            'want_to_read': want_to_read,
            'reading_streak': reading_streak,
            'monthly_pages': monthly_pages,
            'recent_activity': [log.to_dict() for log in recent_logs]
        }
    
    def get_community_activity(self) -> Dict[str, Any]:
        """
        Get community-wide activity statistics
        
        Returns:
            Dictionary with community statistics
        """
        # Get active readers (users with reading activity in last 30 days)
        thirty_days_ago = date.today() - timedelta(days=30)
        active_readers = ReadingLog.query.filter(ReadingLog.date >= thirty_days_ago)\
            .with_entities(ReadingLog.user_id)\
            .distinct()\
            .count()
        
        # Get books finished this month
        current_month = datetime.now().month
        current_year = datetime.now().year
        books_this_month = Book.query.filter(
            func.extract('month', Book.finish_date) == current_month,
            func.extract('year', Book.finish_date) == current_year
        ).count()
        
        # Get currently reading books
        currently_reading = Book.query.filter(
            Book.finish_date.is_(None),
            Book.want_to_read == False,
            Book.library_only == False
        ).count()
        
        # Get recent activity
        recent_activity = ReadingLog.query\
            .order_by(desc(ReadingLog.date))\
            .limit(20)\
            .all()
        
        return {
            'active_readers': active_readers,
            'books_this_month': books_this_month,
            'currently_reading': currently_reading,
            'recent_activity': [log.to_dict() for log in recent_activity]
        }

    def get_active_readers(self) -> List[Dict[str, Any]]:
        """
        Get active readers with their statistics
        
        Returns:
            List of active readers with stats
        """
        # Get users who share their reading activity
        sharing_users = User.query.filter_by(share_reading_activity=True, is_active=True).all()
        
        user_stats = []
        for user in sharing_users:
            # Get books this month
            current_month = datetime.now().month
            current_year = datetime.now().year
            books_this_month = Book.query.filter(
                Book.user_id == user.id,
                func.extract('month', Book.finish_date) == current_month,
                func.extract('year', Book.finish_date) == current_year
            ).count()
            
            # Get total books
            total_books = Book.query.filter_by(user_id=user.id).count()
            
            # Get currently reading
            currently_reading = Book.query.filter(
                Book.user_id == user.id,
                Book.finish_date.is_(None),
                Book.want_to_read == False,
                Book.library_only == False
            ).count()
            
            user_stats.append({
                'user': user.to_dict(),
                'books_this_month': books_this_month,
                'total_books': total_books,
                'currently_reading': currently_reading
            })
        
        # Sort by activity (books this month + currently reading)
        user_stats.sort(key=lambda x: x['books_this_month'] + x['currently_reading'], reverse=True)
        
        return user_stats

    def get_books_this_month(self) -> List[Dict[str, Any]]:
        """
        Get books finished this month by community members
        
        Returns:
            List of books with user information
        """
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        books = Book.query.join(User).filter(
            func.extract('month', Book.finish_date) == current_month,
            func.extract('year', Book.finish_date) == current_year,
            User.share_reading_activity == True,
            User.is_active == True
        ).all()
        
        return [book.to_dict() for book in books]

    def get_currently_reading(self) -> List[Dict[str, Any]]:
        """
        Get books currently being read by community members
        
        Returns:
            List of books with user information
        """
        books = Book.query.join(User).filter(
            Book.finish_date.is_(None),
            Book.want_to_read == False,
            Book.library_only == False,
            User.share_reading_activity == True,
            User.is_active == True
        ).all()
        
        return [book.to_dict() for book in books]

    def get_recent_activity(self) -> List[Dict[str, Any]]:
        """
        Get recent reading activity from community members
        
        Returns:
            List of reading logs with user and book information
        """
        logs = ReadingLog.query.join(User).join(Book).filter(
            User.share_reading_activity == True,
            User.is_active == True
        ).order_by(desc(ReadingLog.date)).limit(20).all()
        
        return [log.to_dict() for log in logs]

    def get_user_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Get public profile for a user
        
        Args:
            user_id: User ID
            
        Returns:
            User profile data or None if not found/sharing
        """
        user = User.query.filter_by(id=user_id, is_active=True).first()
        
        if not user or not user.share_reading_activity:
            return None
        
        # Get user statistics
        total_books = Book.query.filter_by(user_id=user.id).count()
        currently_reading = Book.query.filter(
            Book.user_id == user.id,
            Book.finish_date.is_(None),
            Book.want_to_read == False,
            Book.library_only == False
        ).count()
        finished_books = Book.query.filter(
            Book.user_id == user.id,
            Book.finish_date.is_not(None)
        ).count()
        want_to_read = Book.query.filter_by(user_id=user.id, want_to_read=True).count()
        
        # Get reading streak
        reading_streak = user.get_reading_streak()
        
        # Get user's books
        books = Book.query.filter_by(user_id=user.id).all()
        
        return {
            **user.to_dict(),
            'total_books': total_books,
            'currently_reading': currently_reading,
            'finished_books': finished_books,
            'want_to_read': want_to_read,
            'reading_streak': reading_streak,
            'books': [book.to_dict() for book in books]
        }
    
    def get_user_reading_history(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get user's reading history
        
        Args:
            user_id: User ID
            
        Returns:
            List of reading log entries
        """
        logs = ReadingLog.query.filter_by(user_id=user_id)\
            .order_by(desc(ReadingLog.date))\
            .all()
        
        return [log.to_dict() for log in logs]
    
    def handle_failed_login(self, username: str) -> bool:
        """
        Handle failed login attempt
        
        Args:
            username: Username that failed login
            
        Returns:
            True if account is now locked
        """
        user = self.get_user_by_username(username)
        if not user:
            return False
        
        user.increment_failed_login()
        self.db.commit()
        
        return user.is_locked()
    
    def reset_failed_login(self, username: str) -> None:
        """
        Reset failed login attempts for user
        
        Args:
            username: Username to reset
        """
        user = self.get_user_by_username(username)
        if user:
            user.reset_failed_login()
            self.db.commit()
    
    def unlock_account(self, user_id: int) -> None:
        """
        Unlock a user account
        
        Args:
            user_id: User ID to unlock
        """
        user = self.get_user_by_id(user_id)
        if user:
            user.unlock_account()
            self.db.commit()
    
    def get_system_settings(self) -> Dict[str, Any]:
        """
        Get system-wide settings
        
        Returns:
            Dictionary with system settings
        """
        settings = SystemSettings.query.all()
        return {setting.key: setting.value for setting in settings}
    
    def set_system_setting(self, key: str, value: str, description: str = None, user_id: int = None) -> None:
        """
        Set a system-wide setting
        
        Args:
            key: Setting key
            value: Setting value
            description: Setting description
            user_id: User ID who made the change
        """
        SystemSettings.set_setting(key, value, description, user_id) 