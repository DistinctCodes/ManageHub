'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Head from 'next/head'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

type ProfileFormData = z.infer<typeof profileSchema>

type UserProfile = {
  id: string
  name: string
  email: string
  walletAddress: string
  accountType: string
  dateJoined: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) throw new Error('Failed to fetch user data')
        const data = await res.json()
        setUser(data)
        reset({ name: data.name, email: data.email })
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [reset])

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update profile')
      alert('Profile updated!')
    } catch (err) {
      alert((err as Error).message)
    }
  }

  if (loading) return <p className="p-4">Loading...</p>
  if (error) return <p className="p-4 text-red-500">{error}</p>
  if (!user) return null

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <Head>
        <title>User Profile</title>
      </Head>

      <h1 className="text-2xl font-bold mb-6">User Profile</h1>

      
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4 mb-8">
        <p><strong>Full Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Wallet Address:</strong> {user.walletAddress}</p>
        <p><strong>Account Type:</strong> {user.accountType}</p>
        <p><strong>Date Joined:</strong> {new Date(user.dateJoined).toLocaleDateString()}</p>
      </div>

      
      <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              {...register('name')}
              className="w-full mt-1 p-2 border rounded"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full mt-1 p-2 border rounded"
            />
            {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}
