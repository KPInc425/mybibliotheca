import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useBooksStore } from '@/store/books'
import { api } from '@/api/client'
import Icon from '@/components/Icon'
import { resolveMediaUrl, debugResolvedMedia } from '@/utils/media'
import {
	UserIcon,
	EnvelopeIcon,
	CalendarIcon,
	BookOpenIcon,
	ClockIcon,
	ShieldCheckIcon,
	Cog6ToothIcon,
	PencilIcon,
	CheckIcon,
	XMarkIcon,
	MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'

const ProfilePage: React.FC = () => {
	const navigate = useNavigate()
	const { user } = useAuthStore()
	const { books } = useBooksStore()
	const [isEditing, setIsEditing] = useState(false)
	const [formData, setFormData] = useState({
		username: user?.username || '',
		email: user?.email || '',
	})
	const [showChangePassword, setShowChangePassword] = useState(false)
	const [passwordData, setPasswordData] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	})
	const [passwordError, setPasswordError] = useState('')
	const [isChangingPassword, setIsChangingPassword] = useState(false)
	const [uploadingPicture, setUploadingPicture] = useState(false)
	const [pictureError, setPictureError] = useState('')

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			const res = await api.user.updateProfile({
				username: formData.username,
				email: formData.email,
			})
			if (res.success) {
				// Refresh current user
				const profile = await api.user.getProfile()
				if (profile.success && profile.data) {
					window.location.reload()
				} else {
					setIsEditing(false)
				}
			} else {
				alert(res.error || 'Failed to update profile')
			}
		} catch (err) {
			alert('Failed to update profile')
			console.error('Update profile error:', err)
		}
	}

	const handleCancel = () => {
		setFormData({
			username: user?.username || '',
			email: user?.email || '',
		})
		setIsEditing(false)
	}

	// Quick action handlers
	const handleSettings = () => {
		navigate('/settings')
	}

	const handleChangePassword = () => {
		setShowChangePassword(true)
		setPasswordData({
			currentPassword: '',
			newPassword: '',
			confirmPassword: '',
		})
		setPasswordError('')
	}

	const handlePasswordChange = (field: string, value: string) => {
		setPasswordData((prev) => ({
			...prev,
			[field]: value,
		}))
		setPasswordError('')
	}

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (passwordData.newPassword !== passwordData.confirmPassword) {
			setPasswordError('New passwords do not match')
			return
		}

		if (passwordData.newPassword.length < 12) {
			setPasswordError('New password must be at least 12 characters long')
			return
		}

		try {
			setIsChangingPassword(true)
			setPasswordError('')


			const res = await api.auth.changePassword({
				current_password: passwordData.currentPassword,
				new_password: passwordData.newPassword,
			})

			if (!res.data?.success) {
				setPasswordError(res.data?.error || 'Failed to change password')
				return
			}

			setShowChangePassword(false)
			setPasswordData({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			})
			alert('Password changed successfully!')
		} catch (error) {
			setPasswordError('Failed to change password. Please try again.')
		} finally {
			setIsChangingPassword(false)
		}
	}

	const handleMyActivity = () => {
		navigate('/community/activity')
	}

	const handleProfilePictureUpload = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const file = event.target.files?.[0]
		if (!file) return

		try {
			setUploadingPicture(true)
			setPictureError('')

			const response = await api.profile.uploadPicture(file)
			if (response.data.success) {
				// Refresh user data to get updated profile picture
				window.location.reload()
			} else {
				setPictureError(
					response.data.error || 'Failed to upload profile picture'
				)
			}
		} catch (err) {
			setPictureError('Failed to upload profile picture')
			console.error('Profile picture upload error:', err)
		} finally {
			setUploadingPicture(false)
		}
	}

	const handleDeleteProfilePicture = async () => {
		if (!confirm('Are you sure you want to delete your profile picture?')) {
			return
		}

		try {
			setUploadingPicture(true)
			setPictureError('')

			const response = await api.profile.deletePicture()
			if (response.data.success) {
				// Refresh user data to get updated profile picture
				window.location.reload()
			} else {
				setPictureError(
					response.data.error || 'Failed to delete profile picture'
				)
			}
		} catch (err) {
			setPictureError('Failed to delete profile picture')
			console.error('Profile picture delete error:', err)
		} finally {
			setUploadingPicture(false)
		}
	}

	// Calculate user statistics
	const totalBooks = books.length
	const finishedBooks = books.filter((book) => book.finish_date).length
	const currentlyReading = books.filter(
		(book) => book.start_date && !book.finish_date
	).length
	const wantToRead = books.filter((book) => book.want_to_read).length

	return (
		<div className='space-y-8'>
			{/* Header */}
			<div className='dashboard-header relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white text-center py-8 mb-8'>
				<h1 className='text-4xl md:text-5xl lg:text-6xl font-bold m-0 text-shadow-lg relative z-10'>
					👤 User Profile
				</h1>
				<p className='text-xl opacity-90 mt-2'>Manage your account settings</p>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
				{/* Main Profile Section */}
				<div className='lg:col-span-2 space-y-6'>
					{/* Profile Information */}
					<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
						<div className='flex items-center justify-between mb-6'>
							<h2 className='text-2xl font-bold text-primary flex items-center gap-2'>
								<Icon
									hero={<UserIcon className='w-6 h-6' />}
									emoji='👤'
								/>
								Profile Information
							</h2>
							{!isEditing && (
								<button
									onClick={() => setIsEditing(true)}
									className='btn btn-outline btn-primary btn-sm'
								>
									<PencilIcon className='w-4 h-4 mr-2' />
									Edit Profile
								</button>
							)}
						</div>

						{/* Profile Picture Section */}
						<div className='mb-6 p-4 bg-base-200 rounded-lg'>
							<div className='flex items-center gap-4'>
								<div className='avatar'>
									<div className='ring-primary ring-offset-base-100 w-20 rounded-full ring-2 ring-offset-2'>
										{user?.profile_picture ? (
											<img
												src={(debugResolvedMedia('profile.avatar', user?.profile_picture, resolveMediaUrl(user?.profile_picture)), resolveMediaUrl(user?.profile_picture))}
												alt='Profile Picture'
												className='w-full h-full object-cover rounded-full'
												onError={(e) => {
													const target = e.target as HTMLImageElement
													target.style.display = 'none'
													target.nextElementSibling?.classList.remove('hidden')
												}}
											/>
										) : null}
										<div
											className={`w-full h-full bg-primary text-primary-content rounded-full flex items-center justify-center text-2xl font-bold ${
												user?.profile_picture ? 'hidden' : ''
											}`}
										>
											{user?.username?.charAt(0).toUpperCase() || 'U'}
										</div>
									</div>
								</div>
								<div className='flex-1'>
									<h3 className='font-semibold mb-2'>Profile Picture</h3>
									<div className='flex gap-2'>
										<label className='btn btn-primary btn-sm'>
											<input
												type='file'
												accept='image/*'
												onChange={handleProfilePictureUpload}
												className='hidden'
												disabled={uploadingPicture}
											/>
											{uploadingPicture ? 'Uploading...' : 'Upload Picture'}
										</label>
										{user?.profile_picture && (
											<button
												onClick={handleDeleteProfilePicture}
												className='btn btn-error btn-sm'
												disabled={uploadingPicture}
											>
												Remove
											</button>
										)}
									</div>
									{pictureError && (
										<p className='text-error text-sm mt-2'>{pictureError}</p>
									)}
									<p className='text-xs text-base-content/60 mt-1'>
										Supported formats: PNG, JPG, JPEG, GIF, WEBP (max 5MB)
									</p>
								</div>
							</div>
						</div>

						{isEditing ? (
							<form
								onSubmit={handleSubmit}
								className='space-y-6'
							>
								<div className='form-control'>
									<label className='label'>
										<span className='label-text font-semibold'>Username</span>
									</label>
									<input
										type='text'
										className='input input-bordered w-full'
										value={formData.username}
										onChange={(e) =>
											handleInputChange('username', e.target.value)
										}
										required
									/>
								</div>

								<div className='form-control'>
									<label className='label'>
										<span className='label-text font-semibold'>Email</span>
									</label>
									<input
										type='email'
										className='input input-bordered w-full'
										value={formData.email}
										onChange={(e) => handleInputChange('email', e.target.value)}
										required
									/>
								</div>

								<div className='flex gap-3'>
									<button
										type='submit'
										className='btn btn-primary'
									>
										<CheckIcon className='w-4 h-4 mr-2' />
										Save Changes
									</button>
									<button
										type='button'
										onClick={handleCancel}
										className='btn btn-outline'
									>
										<XMarkIcon className='w-4 h-4 mr-2' />
										Cancel
									</button>
								</div>
							</form>
						) : (
							<div className='space-y-4'>
								<div className='flex items-center gap-3 p-4 bg-base-200 rounded-lg'>
									<Icon
										hero={<UserIcon className='w-5 h-5' />}
										emoji='👤'
									/>
									<div>
										<span className='font-semibold'>Username:</span>
										<p className='text-base-content/70'>{user?.username}</p>
									</div>
								</div>

								<div className='flex items-center gap-3 p-4 bg-base-200 rounded-lg'>
									<Icon
										hero={<EnvelopeIcon className='w-5 h-5' />}
										emoji='📧'
									/>
									<div>
										<span className='font-semibold'>Email:</span>
										<p className='text-base-content/70'>{user?.email}</p>
									</div>
								</div>

								<div className='flex items-center gap-3 p-4 bg-base-200 rounded-lg'>
									<Icon
										hero={<CalendarIcon className='w-5 h-5' />}
										emoji='📅'
									/>
									<div>
										<span className='font-semibold'>Member Since:</span>
										<p className='text-base-content/70'>
											{user?.created_at
												? new Date(user.created_at).toLocaleDateString()
												: 'Unknown'}
										</p>
									</div>
								</div>

								<div className='flex items-center gap-3 p-4 bg-base-200 rounded-lg'>
									<Icon
										hero={<ShieldCheckIcon className='w-5 h-5' />}
										emoji='🛡️'
									/>
									<div>
										<span className='font-semibold'>Account Type:</span>
										<div className='mt-1'>
											{user?.is_admin ? (
												<span className='badge badge-error'>Administrator</span>
											) : (
												<span className='badge badge-primary'>User</span>
											)}
										</div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Reading Statistics */}
					<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
						<h2 className='text-2xl font-bold text-primary mb-6 flex items-center gap-2'>
							<Icon
								hero={<BookOpenIcon className='w-6 h-6' />}
								emoji='📊'
							/>
							Reading Statistics
						</h2>

						<div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
							<div className='stat bg-primary text-primary-content rounded-box'>
								<div className='stat-title text-primary-content/80'>
									Total Books
								</div>
								<div className='stat-value text-2xl'>{totalBooks}</div>
							</div>

							<div className='stat bg-success text-success-content rounded-box'>
								<div className='stat-title text-success-content/80'>
									Finished
								</div>
								<div className='stat-value text-2xl'>{finishedBooks}</div>
							</div>

							<div className='stat bg-info text-info-content rounded-box'>
								<div className='stat-title text-info-content/80'>
									Currently Reading
								</div>
								<div className='stat-value text-2xl'>{currentlyReading}</div>
							</div>

							<div className='stat bg-warning text-warning-content rounded-box'>
								<div className='stat-title text-warning-content/80'>
									Want to Read
								</div>
								<div className='stat-value text-2xl'>{wantToRead}</div>
							</div>
						</div>

						{totalBooks > 0 && (
							<div className='mt-6 p-4 bg-base-200 rounded-lg'>
								<h3 className='font-semibold mb-2'>Reading Progress</h3>
								<div className='space-y-2'>
									<div className='flex justify-between text-sm'>
										<span>Completion Rate:</span>
										<span className='font-semibold'>
											{Math.round((finishedBooks / totalBooks) * 100)}%
										</span>
									</div>
									<div className='w-full bg-base-300 rounded-full h-2'>
										<div
											className='bg-primary h-2 rounded-full'
											style={{
												width: `${(finishedBooks / totalBooks) * 100}%`,
											}}
										></div>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Recent Activity */}
					<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
						<h2 className='text-2xl font-bold text-primary mb-6 flex items-center gap-2'>
							<Icon
								hero={<ClockIcon className='w-6 h-6' />}
								emoji='⏰'
							/>
							Recent Activity
						</h2>

						<div className='space-y-4'>
							{books.slice(0, 5).map((book) => (
								<div
									key={book.uid}
									className='flex items-center gap-4 p-3 bg-base-200 rounded-lg'
								>
									<div className='w-12 h-16 bg-base-300 rounded-lg overflow-hidden flex-shrink-0'>
										<img
											src={book.cover_url ?? '/bookshelf.png'}
											className='w-full h-full object-cover'
											alt={`${book.title} cover`}
											onError={(e) => {
												const target = e.target as HTMLImageElement
												// Prevent infinite loop by checking if we're already using the fallback
												if (
													target.src !==
													window.location.origin + '/bookshelf.png'
												) {
													target.src = '/bookshelf.png'
												} else {
													// If fallback also fails, hide the image and show a placeholder
													target.style.display = 'none'
													const placeholder = document.createElement('div')
													placeholder.className =
														'w-full h-full bg-base-200 rounded flex items-center justify-center text-sm'
													placeholder.innerHTML = '📚'
													target.parentNode?.appendChild(placeholder)
												}
											}}
										/>
									</div>
									<div className='flex-grow'>
										<h3 className='font-semibold'>{book.title}</h3>
										<p className='text-sm text-base-content/70'>
											{book.author}
										</p>
										<div className='flex gap-2 mt-1'>
											{book.finish_date && (
												<span className='badge badge-success badge-xs'>
													Finished
												</span>
											)}
											{book.start_date && !book.finish_date && (
												<span className='badge badge-info badge-xs'>
													Reading
												</span>
											)}
											{book.want_to_read && (
												<span className='badge badge-warning badge-xs'>
													Want to Read
												</span>
											)}
										</div>
									</div>
								</div>
							))}

							{books.length === 0 && (
								<div className='text-center py-8'>
									<BookOpenIcon className='w-16 h-16 text-base-content/30 mx-auto mb-4' />
									<p className='text-base-content/70'>
										No books in your library yet
									</p>
									<p className='text-sm text-base-content/50 mt-2'>
										Start by adding your first book!
									</p>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div className='lg:col-span-1 space-y-6'>
					{/* Account Info */}
					<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
						<h3 className='text-xl font-bold text-primary mb-4 flex items-center gap-2'>
							<Icon
								hero={<UserIcon className='w-5 h-5' />}
								emoji='👤'
							/>
							Account Info
						</h3>
						<div className='space-y-3'>
							<div>
								<span className='font-semibold'>Username:</span>
								<p className='text-base-content/70'>{user?.username}</p>
							</div>
							<div>
								<span className='font-semibold'>Email:</span>
								<p className='text-base-content/70'>{user?.email}</p>
							</div>
							<div>
								<span className='font-semibold'>Account Type:</span>
								<div className='mt-1'>
									{user?.is_admin ? (
										<span className='badge badge-error'>Administrator</span>
									) : (
										<span className='badge badge-primary'>User</span>
									)}
								</div>
							</div>
							<div>
								<span className='font-semibold'>Member Since:</span>
								<p className='text-base-content/70'>
									{user?.created_at
										? new Date(user.created_at).toLocaleDateString()
										: 'Unknown'}
								</p>
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
						<h3 className='text-xl font-bold text-primary mb-4 flex items-center gap-2'>
							<Icon
								hero={<Cog6ToothIcon className='w-5 h-5' />}
								emoji='⚡'
							/>
							Quick Actions
						</h3>
						<div className='space-y-3'>
							<button
								onClick={handleSettings}
								className='btn btn-outline btn-primary w-full'
							>
								<Icon
									hero={<Cog6ToothIcon className='w-4 h-4' />}
									emoji='⚙️'
								/>
								<span className='ml-2'>Settings</span>
							</button>
							<button
								onClick={handleChangePassword}
								className='btn btn-outline btn-secondary w-full'
							>
								<Icon
									hero={<ShieldCheckIcon className='w-4 h-4' />}
									emoji='🔒'
								/>
								<span className='ml-2'>Change Password</span>
							</button>
							<button
								onClick={handleMyActivity}
								className='btn btn-outline btn-info w-full'
							>
								<Icon
									hero={<BookOpenIcon className='w-4 h-4' />}
									emoji='📚'
								/>
								<span className='ml-2'>My Activity</span>
							</button>
							<Link
								to='/invites'
								className='btn btn-outline btn-warning w-full'
							>
								<Icon
									hero={<EnvelopeIcon className='w-4 h-4' />}
									emoji='✉️'
								/>
								<span className='ml-2'>Manage Invites</span>
							</Link>
						</div>
					</div>

					{/* Admin Debug Settings */}
					{user?.is_admin && (
						<div className='bg-base-100 border-2 border-secondary rounded-2xl p-6 shadow-lg'>
							<h3 className='text-xl font-bold text-primary mb-4 flex items-center gap-2'>
								<Icon
									hero={<Cog6ToothIcon className='w-5 h-5' />}
									emoji='🔧'
								/>
								Debug Settings
							</h3>
							<div className='flex items-center gap-3'>
								<input
									type='checkbox'
									className='toggle toggle-primary'
									id='debug_mode'
								/>
								<div>
									<label
										className='font-semibold flex items-center gap-2'
										htmlFor='debug_mode'
									>
										<Icon
											hero={<MagnifyingGlassIcon className='w-4 h-4' />}
											emoji='🔍'
										/>
										Enable Debug Mode
									</label>
									<p className='text-sm text-base-content/60'>
										Show debug information and enable the test scanner button on
										the library page for troubleshooting
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Change Password Modal */}
			{showChangePassword && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='font-bold text-lg text-primary mb-4'>
							🔒 Change Password
						</h3>
						<form
							onSubmit={handlePasswordSubmit}
							className='space-y-4'
						>
							{passwordError && (
								<div className='alert alert-error'>
									<span>{passwordError}</span>
								</div>
							)}

							<div className='form-control'>
								<label className='label'>
									<span className='label-text font-semibold'>
										Current Password
									</span>
								</label>
								<input
									type='password'
									className='input input-bordered w-full'
									value={passwordData.currentPassword}
									onChange={(e) =>
										handlePasswordChange('currentPassword', e.target.value)
									}
									required
								/>
							</div>

							<div className='form-control'>
								<label className='label'>
									<span className='label-text font-semibold'>New Password</span>
								</label>
								<input
									type='password'
									className='input input-bordered w-full'
									value={passwordData.newPassword}
									onChange={(e) =>
										handlePasswordChange('newPassword', e.target.value)
									}
									required
								/>
							</div>

							<div className='form-control'>
								<label className='label'>
									<span className='label-text font-semibold'>
										Confirm New Password
									</span>
								</label>
								<input
									type='password'
									className='input input-bordered w-full'
									value={passwordData.confirmPassword}
									onChange={(e) =>
										handlePasswordChange('confirmPassword', e.target.value)
									}
									required
								/>
							</div>

							<div className='modal-action'>
								<button
									type='button'
									onClick={() => setShowChangePassword(false)}
									className='btn btn-outline'
									disabled={isChangingPassword}
								>
									Cancel
								</button>
								<button
									type='submit'
									className='btn btn-primary'
									disabled={isChangingPassword}
								>
									{isChangingPassword ? (
										<>
											<span className='loading loading-spinner loading-xs'></span>
											Changing...
										</>
									) : (
										'Change Password'
									)}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default ProfilePage
