import test from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import bcrypt from 'bcrypt'
import { allDoctors } from '../controller/adminDoctorController.js'
import doctorModel from '../models/doctorModel.js'

process.env.NODE_ENV = 'test'
const { app } = await import('../server.js')
const api = request(app)

test('health endpoint returns API status', async () => {
    const response = await api.get('/')
    assert.equal(response.status, 200)
    assert.match(response.text, /DocNest API running/)
})

test('unknown routes return JSON 404', async () => {
    const response = await api.get('/api/not-a-route')
    assert.equal(response.status, 404)
    assert.equal(response.body.success, false)
})

test('user protected routes require user cookie', async () => {
    const routes = [
        ['get', '/api/user/get-profile'],
        ['post', '/api/user/update-profile'],
        ['post', '/api/user/book-appointment'],
        ['get', '/api/user/appointments'],
        ['post', '/api/user/cancel-appointment'],
        ['post', '/api/user/payment-razorpay'],
        ['post', '/api/user/verifyRazorpay']
    ]

    for (const [method, route] of routes) {
        const response = await api[method](route)
        assert.equal(response.status, 401, `${method.toUpperCase()} ${route}`)
    }
})

test('doctor protected routes require doctor cookie', async () => {
    const routes = [
        ['get', '/api/doctor/appointments'],
        ['post', '/api/doctor/complete-appointment'],
        ['post', '/api/doctor/cancel-appointment'],
        ['get', '/api/doctor/dashboard'],
        ['get', '/api/doctor/profile'],
        ['post', '/api/doctor/update-profile'],
        ['get', '/api/doctor/ratings'],
        ['get', '/api/doctor/visit-stats'],
        ['get', '/api/doctor/revenue'],
        ['get', '/api/doctor/upcoming-today']
    ]

    for (const [method, route] of routes) {
        const response = await api[method](route)
        assert.equal(response.status, 401, `${method.toUpperCase()} ${route}`)
    }
})

test('admin protected routes require admin cookie', async () => {
    const routes = [
        ['post', '/api/admin/add-doctor'],
        ['post', '/api/admin/all-doctors'],
        ['post', '/api/admin/change-availability'],
        ['get', '/api/admin/appointments'],
        ['post', '/api/admin/cancel-appointment'],
        ['get', '/api/admin/dashboard']
    ]

    for (const [method, route] of routes) {
        const response = await api[method](route)
        assert.equal(response.status, 401, `${method.toUpperCase()} ${route}`)
    }
})

test('participant-protected chat and call routes require cookies', async () => {
    const routes = [
        ['post', '/api/chat/upload-image'],
        ['get', '/api/chat/history/not-a-room'],
        ['put', '/api/chat/mark-read/not-a-room'],
        ['post', '/api/calls/start'],
        ['put', '/api/calls/status'],
        ['get', '/api/calls/history/not-a-user']
    ]

    for (const [method, route] of routes) {
        const response = await api[method](route)
        assert.equal(response.status, 401, `${method.toUpperCase()} ${route}`)
    }
})

test('AI route requires user authentication', async () => {
    const response = await api.post('/api/chat/message').send({ message: 'hello' })
    assert.equal(response.status, 401)
})

test('review mutation routes require user authentication', async () => {
    const routes = [
        ['post', '/api/reviews/rate'],
        ['post', '/api/reviews/comment/not-a-review'],
        ['put', '/api/reviews/edit/not-a-review'],
        ['delete', '/api/reviews/delete/not-a-review']
    ]

    for (const [method, route] of routes) {
        const response = await api[method](route)
        assert.equal(response.status, 401, `${method.toUpperCase()} ${route}`)
    }
})

test('configured admin password hash matches the expected credential', async () => {
    const isValid = await bcrypt.compare('Admin@123', process.env.ADMIN_PASSWORD_HASH)
    assert.equal(isValid, true)
})

test('refresh without a cookie returns 401', async () => {
    const response = await api.post('/api/user/refresh')
    assert.equal(response.status, 401)
    assert.equal(response.body.success, false)
})

test('refresh with a malformed cookie fails closed with 401', async () => {
    const response = await api
        .post('/api/user/refresh')
        .set('Cookie', 'refreshToken=%E0%A4%A')
    assert.equal(response.status, 401)
    assert.equal(response.body.success, false)
})

test('admin allDoctors tolerates missing speciality in POST payload', async () => {
    const originalFind = doctorModel.find
    const originalCountDocuments = doctorModel.countDocuments

    doctorModel.find = () => ({
        select: () => ({
            sort: () => ({
                skip: () => ({
                    limit: () => ({
                        lean: async () => []
                    })
                })
            })
        })
    })
    doctorModel.countDocuments = async () => 0

    let jsonPayload
    const res = {
        json: payload => {
            jsonPayload = payload
            return payload
        }
    }

    await allDoctors({ query: { limit: '100' }, body: {} }, res)

    doctorModel.find = originalFind
    doctorModel.countDocuments = originalCountDocuments

    assert.equal(jsonPayload.success, true)
    assert.deepEqual(jsonPayload.doctors, [])
})

test('CSRF token remains stable across requests', async () => {
    const agent = request.agent(app)

    const first = await agent.get('/health')
    const firstCookie = first.headers['set-cookie']?.find(cookie => cookie.startsWith('csrfToken='))
    assert.ok(firstCookie)

    const firstToken = decodeURIComponent(firstCookie.split(';')[0].split('=')[1])
    const second = await agent.get('/health')
    const secondCookie = second.headers['set-cookie']?.find(cookie => cookie.startsWith('csrfToken='))
    assert.ok(secondCookie)

    const secondToken = decodeURIComponent(secondCookie.split(';')[0].split('=')[1])
    assert.equal(secondToken, firstToken)
})

test('logout without a cookie clears the user session successfully', async () => {
    const response = await api.post('/api/user/logout')
    assert.equal(response.status, 200)
    assert.equal(response.body.success, true)
    assert.ok(response.headers['set-cookie']?.some(cookie => cookie.startsWith('accessToken=')))
})

