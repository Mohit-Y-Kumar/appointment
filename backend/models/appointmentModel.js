import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true,
        index: true 
    },
    docId: { 
        type: String, 
        required: true,
        index: true 
    },
    slotDate: { 
        type: String, 
        required: true,
        index: true 
    },
    slotTime: { type: String, required: true },
    userData: { type: Object, required: true },
    docData: { type: Object, required: true },
    amount: { type: Number, required: true },
    date: { 
        type: Number, 
        required: true,
        index: true 
    },
    cancelled: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    payment: { 
        type: Boolean, 
        default: false,
        index: true 
    },
    isCompleted: { 
        type: Boolean, 
        default: false,
        index: true 
    },
}, { timestamps: true })

appointmentSchema.index({ userId: 1, cancelled: 1 });
appointmentSchema.index({ docId: 1, slotDate: 1, cancelled: 1 });
appointmentSchema.index({ userId: 1, date: -1 });
appointmentSchema.index({ docId: 1, payment: 1 });

const appointmentModel = mongoose.models.appointment || mongoose.model('appointment', appointmentSchema);

export default appointmentModel;
