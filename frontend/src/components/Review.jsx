import React, { useState, useContext } from "react";
import { assets } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";


const Review = ({
  canReview = false,
  readOnly = false,
  reviewData = [],
  appointmentId,
  doctorId,
  summary = null,
  onReviewSubmit
}) => {
  const { backendUrl, token, userData } = useContext(AppContext);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewId, setReviewId] = useState(null);
  const [step, setStep] = useState("rating");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [currentReviewId, setCurrentReviewId] = useState(null);

  const handleRatingSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating first");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        backendUrl + "/api/reviews/rate",
        { doctorId, appointmentId, rating },
        { withCredentials: true }
      );

      if (data.success) {
        setReviewId(data.reviewId);
        setReviewText("");
        setStep("comment");
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  //  — Comment submit
  const handleCommentSubmit = async () => {
    if (!reviewText.trim()) {
      toast.error("Please write a review before submitting");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(
        backendUrl + `/api/reviews/comment/${reviewId}`,
        { comment: reviewText },
        { withCredentials: true }
      );

      if (data.success) {
        setStep("done");
        toast.success("Review submitted successfully!")
        if (onReviewSubmit) onReviewSubmit();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  //  Edit 
  const handleEditSubmit = async () => {
    try {
      setLoading(true);
      const { data } = await axios.put(
        backendUrl + `/api/reviews/edit/${currentReviewId}`,
        { rating: editRating, comment: editComment },
        { withCredentials: true }
      );
      if (data.success) {
        toast.success("Review updated successfully!");
        setIsEditing(false);
        if (onReviewSubmit) onReviewSubmit();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  //  Delete 
  const handleDelete = async (reviewId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/reviews/delete/${reviewId}`,
        { withCredentials: true }
      );
      if (data.success) {
        toast.success("Review deleted successfully!")
        if (onReviewSubmit) onReviewSubmit();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-gray-50">

      {/* EDITABLE REVIEW SECTION */}
      {canReview && !readOnly && (
        <>
          {/*  Rating */}
          {step === "rating" && (
            <>
              <h2 className="text-lg font-semibold mb-2">How would you rate your experience?</h2>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <img
                    key={star}
                    onClick={() => setRating(star)}
                    src={star <= rating ? assets.filledStar : assets.blackStar}
                    alt="star"
                    className="w-8 h-8 cursor-pointer transition-transform hover:scale-110"
                  />
                ))}
              </div>
              <button
                onClick={handleRatingSubmit}
                disabled={loading || rating === 0}
                className="bg-indigo-600 text-white px-6 py-2 rounded-full disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Rating"}
              </button>
            </>
          )}

          {/*  Comment */}
          {step === "comment" && (
            <>
              <h2 className="text-lg font-semibold mb-2">Share your experience</h2>

              {/*show selected stars */}
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <img
                    key={star}
                    src={star <= rating ? assets.filledStar : assets.blackStar}
                    alt="star"
                    className="w-6 h-6"
                  />
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review..."
                rows={4}
                className="w-full border p-2 rounded mb-3 focus:outline-indigo-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCommentSubmit}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-full disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Review"}
                </button>
                <button
                  onClick={() => setStep("done")}
                  className="border px-6 py-2 rounded-full text-gray-500"
                >
                  Skip for now
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <p className="text-green-600 text-lg font-semibold"> Review submitted successfully</p>
              <p className="text-gray-500 text-sm mt-1">Thank you! Your review has been submitted successfully.</p>
            </div>
          )}
        </>
      )}

      {/* PUBLIC  */}
      {readOnly && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Patient Reviews</h2>

          {/* Rating Summary */}
          {summary && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-lg border">
              <div className="text-center">
                <p className="text-4xl font-bold text-indigo-600">{summary.averageRating}</p>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <img
                      key={star}
                      src={star <= Math.round(summary.averageRating) ? assets.filledStar : assets.blackStar}
                      alt="star"
                      className="w-4 h-4"
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">{summary.totalReviews} reviews</p>
              </div>

              {/* Breakdown bars */}
              <div className="flex-1">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star} className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1 w-8">
                      <span className="text-xs">{star}</span>
                      <img src={assets.filledStar} alt="star" className="w-3 h-3" />
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{
                          width: summary.totalReviews > 0
                            ? `${(summary.ratingBreakdown[star] / summary.totalReviews) * 100}%`
                            : "0%"
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 w-4">{summary.ratingBreakdown[star]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews List */}
          {reviewData.length > 0 ? (
            reviewData.map((review, index) => (
              <div key={index} className="mb-3 p-3 border rounded-lg bg-white">

                {/* Patient Info */}
                <div className="flex items-center gap-2 mb-2">
                  <img
                    src={review.patient?.image || assets.profile_pic}
                    alt="patient"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <p className="font-medium text-sm">{review.patient?.name || "Patient"}</p>
                  <p className="text-xs text-gray-400 ml-auto">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Edit Mode */}
                {isEditing && currentReviewId === review._id ? (
                  <>
                    {/* Edit Stars */}
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <img
                          key={star}
                          onClick={() => setEditRating(star)}
                          src={star <= editRating ? assets.filledStar : assets.blackStar}
                          alt="star"
                          className="w-6 h-6 cursor-pointer"
                        />
                      ))}
                    </div>

                    {/* Edit Textarea */}
                    <textarea
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      rows={3}
                      className="w-full border p-2 rounded mb-2 text-sm focus:outline-indigo-400"
                    />

                    {/* Save & Cancel */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditSubmit}
                        disabled={loading}
                        className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm disabled:opacity-50"
                      >
                        {loading ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false)
                          setCurrentReviewId(null)
                          setEditRating(0)
                          setEditComment('')
                        }}
                        className="border px-4 py-1 rounded-full text-sm text-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal View — Stars */}
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <img
                          key={star}
                          src={star <= review.rating ? assets.filledStar : assets.blackStar}
                          alt="star"
                          className="w-4 h-4"
                        />
                      ))}
                    </div>

                    {/* Comment */}
                    {review.comment && (
                      <p className="text-gray-700 text-sm">{review.comment}</p>
                    )}

                    {/*  Edit & Delete — only own review*/}
                    {token && review.patient?._id === userData?._id && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setCurrentReviewId(review._id);
                            setEditRating(review.rating);
                            setEditComment(review.comment);
                          }}
                          className="flex items-center gap-1 text-xs text-indigo-600 border border-indigo-300 px-3 py-1 rounded-full hover:bg-indigo-50 transition"
                        >
                          <img src={assets.editIcon} alt="edit" className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="flex items-center gap-1 text-xs text-red-500 border border-red-300 px-3 py-1 rounded-full hover:bg-red-50 transition"
                        >
                          <img
                            src={assets.trashIcon}
                            alt="delete"
                            className="w-3.5 h-3.5 "
                          />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500"> No patient reviews available yet.</p>
          )}
        </div>
      )}

      {/* User can't review message */}
      {!canReview && !readOnly && (
        <p className="text-red-500 text-sm">
          You can review only after completing appointment
        </p>
      )}
    </div>
  );
};

export default Review;