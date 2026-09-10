import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        password: {
            type: String,
            required: true
        },
        emailVerified: {
            type: Boolean,
            default: false,
            index: true
        },
        verificationToken: {
            type: String,
            default: null
        },
        verificationTokenExpiry: {
            type: Date,
            default: null
        },

        image: { type: String, required: true },
        speciality: { 
            type: String, 
            required: true,
            index: true 
        },
        degree: { type: String, required: true },
        experience: { type: String, required: true },
        about: { type: String, required: true },
        available: { 
            type: Boolean, 
            default: true,
            index: true 
        },
        fees: { 
            type: Number, 
            required: true,
            index: true 
        },
        address: { type: Object, required: true },
        date: { 
            type: Number, 
            required: true,
            index: true 
        },
        slots_booked: { type: Object, default: {} },
        averageRating: { 
            type: Number, 
            default: 0,
            index: true 
        },
        totalReviews:  { type: Number, default: 0 },
        views: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
    }, { minimize: false }

);

// Compound indexes for common queries
doctorSchema.index({ available: 1, speciality: 1 });
doctorSchema.index({ available: 1, fees: 1 });
doctorSchema.index({ averageRating: -1 });

const doctorModel = mongoose.models.doctor || mongoose.model('doctor', doctorSchema);

export default doctorModel;
