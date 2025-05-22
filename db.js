"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import {
  getCinemaRoomById,
  updateCinemaRoomMovie,
  updateCinemaRoomCapacity
} from "@/services/api"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

export default function EditRoomPage({ params }) {
  const roomId = Number.parseInt(params.roomId)
  const [cinemaRoom, setCinemaRoom] = useState(null)
  const [name, setName] = useState("")
  const [movieTitle, setMovieTitle] = useState("")
  const [moviePoster, setMoviePoster] = useState("")
  const [rows, setRows] = useState(0)
  const [columns, setColumns] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canEditCapacity, setCanEditCapacity] = useState(false)

  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (user?.role !== "admin") {
      router.push("/dashboard")
      return
    }

    const fetchRoomData = async () => {
      try {
        const room = await getCinemaRoomById(roomId)
        setCinemaRoom(room)
        setName(room.name)
        setMovieTitle(room.movie_title)
        setMoviePoster(room.movie_poster)
        setRows(room.rows)
        setColumns(room.columns)
        setCanEditCapacity(true)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load cinema room",
          variant: "destructive",
        })
        router.push("/admin")
      } finally {
        setLoading(false)
      }
    }

    fetchRoomData()
  }, [isAuthenticated, roomId, router, toast, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateCinemaRoomMovie(roomId, {
        name,
        movieTitle,
        moviePoster,
      })

      if (canEditCapacity) {
        await updateCinemaRoomCapacity(roomId, {
          rows: Number(rows),
          columns: Number(columns),
        })
      }

      toast({
        title: "Success",
        description: "Cinema room updated successfully",
      })

      router.push("/admin")
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cinema room",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated || user?.role !== "admin") return null

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <Button onClick={() => router.push("/admin")} variant="outline" className="mb-6">
          Back to Admin Dashboard
        </Button>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Edit Cinema Room</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Room Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="movieTitle">Movie Title</Label>
                <Input
                  id="movieTitle"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moviePoster">Movie Poster URL</Label>
                <Input
                  id="moviePoster"
                  value={moviePoster}
                  onChange={(e) => setMoviePoster(e.target.value)}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-400">Current poster will be used if left unchanged</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rows">Rows</Label>
                  <Input
                    id="rows"
                    type="number"
                    min="1"
                    value={rows}
                    onChange={(e) => setRows(Number.parseInt(e.target.value))}
                    required
                    disabled={!canEditCapacity}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="columns">Columns</Label>
                  <Input
                    id="columns"
                    type="number"
                    min="1"
                    value={columns}
                    onChange={(e) => setColumns(Number.parseInt(e.target.value))}
                    required
                    disabled={!canEditCapacity}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              {!canEditCapacity && (
                <p className="text-sm text-amber-500">
                  Room capacity cannot be modified because there are active reservations.
                </p>
              )}

              <div className="flex justify-end">
                <Button type="submit" className="bg-red-600 hover:bg-red-700" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
