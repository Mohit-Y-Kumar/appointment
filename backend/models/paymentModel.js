import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    appointmentId:       { type: String, required: true, unique: true },
    userId:              { type: String, required: true },
    razorpay_order_id:   { type: String, required: true },
    razorpay_payment_id: { type: String, default: '' },
    razorpay_signature:  { type: String, default: '' },
    status:              { type: String, enum: ['creating', 'created', 'paid', 'failed'], default: 'created' },
    amount:              { type: Number, required: true },
    creationLock:        { type: String, default: null },
    creationLockExpiresAt: { type: Date, default: null }
}, { timestamps: true });

const paymentModel = mongoose.models.payment || mongoose.model('payment', paymentSchema);
export default paymentModel;