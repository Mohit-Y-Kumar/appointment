import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import StateBadge from './StateBadge'
import axios from 'axios'
import { toast } from 'react-toastify'

const DoctorCard = ({ item }) => {
    const { backendUrl, token, userData } = useContext(AppContext)

    const navigate = useNavigate()
    const [liked, setLiked] = useState(
        item.likedBy?.includes(userData?._id) || false
    )
    const [likes, setLikes] = useState(item.likes || 0)
    const [views, setViews] = useState(item.views || 0)

    useEffect(() => {
        if (userData?._id) {
            setLiked(item.likedBy?.includes(userData._id) || false)
        }
    }, [userData, item.likedBy])

    const handleCardClick = async () => {
        try {
            await axios.post(backendUrl + `/api/doctor/view/${item._id}`)
            setViews(prev => prev + 1)
        } catch (error) {
            console.log(error)
        }
        navigate(`/appointment/${item._id}`)
        scrollTo(0, 0)
    }

    const handleLike = async (e) => {
        e.stopPropagation()
        if (!token) {
            toast.warn('Please log in to like this doctor.')
            return
        }
        try {
            const { data } = await axios.post(
                backendUrl + `/api/doctor/like/${item._id}`,
                {},
                { withCredentials: true }
            )
            if (data.success) {
                setLiked(data.liked)
                setLikes(prev => data.liked ? prev + 1 : prev - 1)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div
            onClick={handleCardClick}
            className='group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_50px_rgba(59,130,246,0.12)]'
        >
            <div className='relative overflow-hidden bg-slate-100'>
                <img
                    className='aspect-[4/3] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]'
                    src={item.image}
                    alt=""
                />
                <div className='absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-900/15 to-transparent' />
            </div>

            <div className='absolute left-2 top-2 z-10 flex flex-col gap-2'>
                <StateBadge icon={assets.eye} value={views >= 1000 ? (views / 1000).toFixed(1) + 'k' : views} />
                <div onClick={handleLike}>
                    <StateBadge icon={liked ? assets.filledheart : assets.heart} value={likes >= 1000 ? (likes / 1000).toFixed(1) + 'k' : likes} />
                </div>
                <StateBadge icon={assets.comment} value={item.totalReviews || 0} />
            </div>

            <div className='flex flex-1 flex-col p-4 sm:p-5'>
                <div className={`flex items-center gap-2 text-sm ${item.available ? 'text-emerald-600' : 'text-slate-500'}`}>
                    <span className={`h-2 w-2 rounded-full ${item.available ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className='text-xs font-medium'>{item.available ? 'Available' : 'Not Available'}</span>
                </div>
                <div className='mt-2 flex items-start justify-between gap-3'>
                    <p className='min-w-0 truncate text-base font-semibold text-slate-900 sm:text-lg'>{item.name}</p>
                    <div className='flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700 ring-1 ring-amber-100'>
                        <img src={assets.filledStar} alt="star" className='h-3.5 w-3.5' />
                        <span className='text-xs font-semibold'>
                            {item.averageRating > 0 ? item.averageRating : '0.0'}
                        </span>
                    </div>
                </div>
                <p className='mt-1 text-sm text-slate-600'>{item.speciality}</p>
            </div>
        </div>
    )
}

export default DoctorCard