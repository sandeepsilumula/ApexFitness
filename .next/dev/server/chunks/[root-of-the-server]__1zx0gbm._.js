module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/node:crypto [external] (node:crypto, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:crypto", () => require("node:crypto"));

module.exports = mod;
}),
"[project]/lib/auth.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "SESSION_COOKIE",
    ()=>SESSION_COOKIE,
    "clearSessionCookie",
    ()=>clearSessionCookie,
    "createSession",
    ()=>createSession,
    "getCurrentUser",
    ()=>getCurrentUser,
    "getSessionUser",
    ()=>getSessionUser,
    "hashPassword",
    ()=>hashPassword,
    "revokeSession",
    ()=>revokeSession,
    "setSessionCookie",
    ()=>setSessionCookie,
    "verifyPassword",
    ()=>verifyPassword
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__ = __turbopack_context__.i("[externals]/bcryptjs [external] (bcryptjs, esm_import, [project]/node_modules/bcryptjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [api] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
const BCRYPT_COST = 12;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_COOKIE = 'fitness_session';
async function hashPassword(password) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__["default"].hash(password, BCRYPT_COST);
}
async function verifyPassword(password, hash) {
    return __TURBOPACK__imported__module__$5b$externals$5d2f$bcryptjs__$5b$external$5d$__$28$bcryptjs$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$bcryptjs$29$__["default"].compare(password, hash);
}
async function createSession(userId, expiresAt = new Date(Date.now() + SESSION_TTL_MS)) {
    const token = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["randomBytes"])(32).toString('hex');
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].session.create({
        data: {
            token,
            userId,
            expiresAt
        }
    });
    return token;
}
async function getSessionUser(token) {
    const session = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].session.findUnique({
        where: {
            token
        },
        include: {
            user: true
        }
    });
    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;
    return {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        goal: session.user.goal,
        subscriptionTier: session.user.subscriptionTier,
        stripeCustomerId: session.user.stripeCustomerId
    };
}
async function revokeSession(token) {
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].session.deleteMany({
        where: {
            token
        }
    });
}
function setSessionCookie(res, token) {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : ''}`);
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}
async function getCurrentUser(req) {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length === 0) return null;
    return getSessionUser(token);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/db.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "prisma",
    ()=>prisma
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__ = __turbopack_context__.i("[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)");
var __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$adapter$2d$better$2d$sqlite3__$5b$external$5d$__$2840$prisma$2f$adapter$2d$better$2d$sqlite3$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$adapter$2d$better$2d$sqlite3$29$__ = __turbopack_context__.i("[externals]/@prisma/adapter-better-sqlite3 [external] (@prisma/adapter-better-sqlite3, esm_import, [project]/node_modules/@prisma/adapter-better-sqlite3)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$adapter$2d$better$2d$sqlite3__$5b$external$5d$__$2840$prisma$2f$adapter$2d$better$2d$sqlite3$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$adapter$2d$better$2d$sqlite3$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$adapter$2d$better$2d$sqlite3__$5b$external$5d$__$2840$prisma$2f$adapter$2d$better$2d$sqlite3$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$adapter$2d$better$2d$sqlite3$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const globalForPrisma = globalThis;
function createClient() {
    const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
    const adapter = new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$adapter$2d$better$2d$sqlite3__$5b$external$5d$__$2840$prisma$2f$adapter$2d$better$2d$sqlite3$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$adapter$2d$better$2d$sqlite3$29$__["PrismaBetterSqlite3"]({
        url
    });
    return new __TURBOPACK__imported__module__$5b$externals$5d2f40$prisma$2f$client__$5b$external$5d$__$2840$prisma$2f$client$2c$__cjs$2c$__$5b$project$5d2f$node_modules$2f40$prisma$2f$client$29$__["PrismaClient"]({
        adapter,
        log: ("TURBOPACK compile-time truthy", 1) ? [
            'warn',
            'error'
        ] : "TURBOPACK unreachable"
    });
}
const prisma = globalForPrisma.prisma ?? createClient();
if ("TURBOPACK compile-time truthy", 1) globalForPrisma.prisma = prisma;
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/http.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError,
    "fail",
    ()=>fail,
    "ok",
    ()=>ok
]);
function ok(data) {
    return {
        ok: true,
        data
    };
}
function fail(code, message) {
    return {
        ok: false,
        error: {
            code,
            message
        }
    };
}
class ApiError extends Error {
    code;
    status;
    constructor(code, message, status = 400){
        super(message), this.code = code, this.status = status;
        this.name = 'ApiError';
    }
}
}),
"[project]/lib/rate-limit.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RateLimiter",
    ()=>RateLimiter
]);
class RateLimiter {
    options;
    buckets;
    constructor(options){
        this.options = options;
        this.buckets = new Map();
    }
    check(key) {
        const now = Date.now();
        const existing = this.buckets.get(key);
        if (!existing || existing.resetAt <= now) {
            this.buckets.set(key, {
                count: 1,
                resetAt: now + this.options.windowMs
            });
            return true;
        }
        if (existing.count >= this.options.limit) return false;
        existing.count += 1;
        return true;
    }
}
}),
"[project]/lib/services/coach/context.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "buildCoachContext",
    ()=>buildCoachContext
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [api] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const RECENT_WORKOUT_LIMIT = 5;
/** Weight differences under this are noise, not a trend. */ const STABLE_THRESHOLD_KG = 0.2;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * A single weight reading cannot establish a direction, and neither can a pair
 * with a missing value. Rather than guess, the coach is told the trend is
 * unknown so it does not narrate a change that was never measured.
 */ function deriveWeightTrend(weights) {
    if (weights.length < 2) return 'unknown';
    const earliest = weights[0];
    const latest = weights[weights.length - 1];
    if (earliest === undefined || latest === undefined) return 'unknown';
    const delta = latest - earliest;
    if (Math.abs(delta) < STABLE_THRESHOLD_KG) return 'stable';
    return delta > 0 ? 'up' : 'down';
}
async function buildCoachContext(userId) {
    const user = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].user.findUnique({
        where: {
            id: userId
        },
        select: {
            name: true,
            goal: true,
            experienceLevel: true
        }
    });
    if (!user) {
        throw new Error('Cannot build coach context: user not found');
    }
    const weekAgo = new Date(Date.now() - WEEK_MS);
    const [workoutCount, weeklyWorkoutCount, totalSets, metrics, recentLogs, setsWithLoad] = await Promise.all([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].workoutLog.count({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].workoutLog.count({
            where: {
                userId,
                completedAt: {
                    gte: weekAgo
                }
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].exerciseSet.count({
            where: {
                userId
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].bodyMetric.findMany({
            where: {
                userId,
                weightKg: {
                    not: null
                }
            },
            orderBy: {
                recordedAt: 'asc'
            },
            select: {
                weightKg: true
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].workoutLog.findMany({
            where: {
                userId
            },
            orderBy: {
                completedAt: 'desc'
            },
            take: RECENT_WORKOUT_LIMIT,
            select: {
                workout: {
                    select: {
                        title: true
                    }
                }
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].exerciseSet.findMany({
            where: {
                userId
            },
            select: {
                reps: true,
                weightKg: true
            }
        })
    ]);
    const weights = metrics.map((metric)=>metric.weightKg).filter((weight)=>weight !== null);
    // Sets without a recorded load cannot contribute volume; weight defaults to
    // bodyweight, which is not a number we can honestly multiply out.
    const totalVolumeKg = setsWithLoad.reduce((total, set)=>total + (set.weightKg === null ? 0 : set.weightKg * set.reps), 0);
    return {
        userName: user.name,
        goal: user.goal,
        experienceLevel: user.experienceLevel,
        workoutCount,
        weeklyWorkoutCount,
        totalSets,
        totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
        weightTrend: deriveWeightTrend(weights),
        latestWeightKg: weights.length > 0 ? weights[weights.length - 1] ?? null : null,
        recentWorkoutTitles: recentLogs.map((log)=>log.workout.title)
    };
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/services/coach/index.ts [api] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "getCoachProvider",
    ()=>getCoachProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$live$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coach/live.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coach/simulated.ts [api] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$live$2e$ts__$5b$api$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$live$2e$ts__$5b$api$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
function getCoachProvider() {
    return process.env.ANTHROPIC_API_KEY ? new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$live$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["LiveCoachProvider"]() : new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["SimulatedCoachProvider"]();
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/services/coach/live.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "LiveCoachProvider",
    ()=>LiveCoachProvider
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f40$anthropic$2d$ai$2f$sdk__$5b$external$5d$__$2840$anthropic$2d$ai$2f$sdk$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$29$__ = __turbopack_context__.i("[externals]/@anthropic-ai/sdk [external] (@anthropic-ai/sdk, esm_import, [project]/node_modules/@anthropic-ai/sdk)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coach/simulated.ts [api] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f40$anthropic$2d$ai$2f$sdk__$5b$external$5d$__$2840$anthropic$2d$ai$2f$sdk$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f40$anthropic$2d$ai$2f$sdk__$5b$external$5d$__$2840$anthropic$2d$ai$2f$sdk$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const MODEL_ID = 'claude-opus-5';
const MAX_TOKENS = 2048;
/** The chat route must stay responsive; a slow model is worse than a local answer. */ const REQUEST_TIMEOUT_MS = 8000;
const HISTORY_TURNS = 10;
const SYSTEM_PROMPT = [
    'You are the coaching assistant inside a fitness app. You speak to one named user at a time.',
    'You have no access to tools, files or the internet, and you cannot see anything beyond the',
    'training summary and the conversation provided in the request. Never claim to have looked',
    'something up or to have seen a workout video.',
    'Be concrete and specific: name sets, reps, load, protein quantities or session choices when',
    'the summary supports it. Keep replies to a short paragraph or two — this is a chat panel,',
    'not a long-form plan.',
    'You give general fitness guidance, not medical advice. If the user describes an injury,',
    'pain or a condition that needs a clinician, say so plainly and suggest they speak to a doctor.',
    'If the summary shows the user has logged nothing yet, help them take the first small step',
    'rather than handing them a full programme.'
].join(' ');
/**
 * Serialises the context as short labelled lines rather than JSON. The model
 * reads it as a training summary, and the stable shape keeps the cached prefix
 * intact when only the numbers change.
 */ function summariseContext(context) {
    const lines = [
        `Name: ${context.userName}`,
        `Goal: ${context.goal ?? 'not set'}`,
        `Experience level: ${context.experienceLevel ?? 'not set'}`,
        `Workouts logged (all time): ${context.workoutCount}`,
        `Workouts logged (last 7 days): ${context.weeklyWorkoutCount}`,
        `Total sets logged: ${context.totalSets}`,
        `Total volume lifted: ${context.totalVolumeKg} kg`,
        `Weight trend: ${context.weightTrend}`,
        `Latest weight: ${context.latestWeightKg === null ? 'not recorded' : `${context.latestWeightKg} kg`}`,
        `Recent workouts: ${context.recentWorkoutTitles.length > 0 ? context.recentWorkoutTitles.join(', ') : 'none'}`
    ];
    return lines.join('\n');
}
function buildMessages(input) {
    const history = (input.history ?? []).slice(-HISTORY_TURNS);
    // The API is stateless, so prior turns are replayed before the new question.
    const historyParams = history.filter((entry)=>entry.role === 'user' || entry.role === 'assistant').map((entry)=>({
            role: entry.role,
            content: entry.content
        }));
    return [
        ...historyParams,
        {
            role: 'user',
            content: `<training_summary>\n${summariseContext(input.context)}\n</training_summary>\n\n${input.message}`
        }
    ];
}
function firstTextBlock(response) {
    const block = response.content.find((entry)=>entry.type === 'text');
    return block && block.type === 'text' ? block.text.trim() : '';
}
class LiveCoachProvider {
    fallback = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["SimulatedCoachProvider"]();
    // Held so a failure can close the client and release its connection pool.
    client = null;
    getClient() {
        this.client ??= new __TURBOPACK__imported__module__$5b$externals$5d2f40$anthropic$2d$ai$2f$sdk__$5b$external$5d$__$2840$anthropic$2d$ai$2f$sdk$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$29$__["default"]({
            maxRetries: 1,
            timeout: REQUEST_TIMEOUT_MS
        });
        return this.client;
    }
    /**
   * Drops the client so a failed instance is not reused. The SDK keeps a
   * connection pool alive, and holding a client that failed on a bad key or an
   * unreachable API would keep the process from exiting.
   */ discardClient() {
        this.client = null;
    }
    async reply(input) {
        try {
            const response = await this.getClient().messages.create({
                model: MODEL_ID,
                max_tokens: MAX_TOKENS,
                system: [
                    {
                        type: 'text',
                        text: SYSTEM_PROMPT,
                        // The instruction block is identical on every request, so it is the
                        // stable prefix worth caching; the summary and the question vary.
                        cache_control: {
                            type: 'ephemeral'
                        }
                    }
                ],
                messages: buildMessages(input)
            });
            const text = firstTextBlock(response);
            // A refusal or an empty completion leaves nothing useful to show, so the
            // simulated coach answers rather than the UI rendering a blank bubble.
            if (text.length === 0) return this.fallback.reply(input);
            return {
                text,
                degraded: false
            };
        } catch  {
            // Network errors, auth failures, rate limits and timeouts all land here.
            // The user gets a useful answer instead of a raw SDK error message, and
            // `degraded` tells the UI to label it as a fallback rather than the coach.
            this.discardClient();
            return this.fallback.reply(input);
        }
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/services/coach/simulated.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SimulatedCoachProvider",
    ()=>SimulatedCoachProvider
]);
/** Below this much logged work, a beginner is better served by consistency than intensity. */ const LOW_VOLUME_SETS = 20;
function describeWeight(context) {
    if (context.latestWeightKg === null) return 'no weight recorded yet';
    const weight = `${context.latestWeightKg} kg`;
    switch(context.weightTrend){
        case 'down':
            return `down to ${weight} from your starting point`;
        case 'up':
            return `up to ${weight}`;
        case 'stable':
            return `holding steady at ${weight}`;
        default:
            return `at ${weight}, with not enough readings yet to call a trend`;
    }
}
function buildProgressReply(context) {
    const recent = context.recentWorkoutTitles.length > 0 ? ` Your recent work includes ${context.recentWorkoutTitles.slice(0, 3).join(', ')}.` : '';
    return `You are ${describeWeight(context)} across ${context.workoutCount} logged workout(s), ` + `with ${context.totalSets} sets and ${Math.round(context.totalVolumeKg).toLocaleString('en-GB')} kg ` + `of total volume. ${context.weeklyWorkoutCount} of those fell in the last seven days, ` + `which is ${context.weeklyWorkoutCount >= 3 ? 'a solid weekly cadence' : 'a light week — one more session would help'}.` + recent + ' Keep the cadence consistent before changing anything else.';
}
function buildContextReply(context) {
    const { userName } = context;
    if (context.workoutCount === 0) {
        return `Welcome, ${userName}. You have not logged a workout yet, so start there — ` + 'pick the shortest session in the library, do it once end to end, and log it. ' + 'The habit of finishing one session matters far more this week than intensity.';
    }
    if (context.goal === 'cut' && context.weightTrend === 'up') {
        return `Your weight is ${describeWeight(context)}, which runs against your cut goal. ` + 'Before adding training volume, check protein intake and total calories: aim for ' + '1.6–2.2 g of protein per kilo of bodyweight, then trim 200–300 kcal rather than ' + 'cutting harder. If the trend holds for another week, reduce carbs around training ' + 'rather than dropping the session itself.';
    }
    if (context.totalSets < LOW_VOLUME_SETS) {
        return `${userName}, you have logged ${context.workoutCount} workout(s) and ` + `${context.totalSets} set(s) in total. That is a low volume floor rather than a ` + 'problem. Add one set per exercise, or a second weekly session, and let progressive ' + 'overload do the rest — hold the movements and add reps or load before adding exercises.';
    }
    return buildProgressReply(context);
}
// --- intent routing ---------------------------------------------------------
//
// The context branches above already answer progress and volume questions well,
// so routing only intercepts topics the context summary cannot serve: greetings,
// nutrition and anything health-related. Everything else falls through to the
// context reply, which is the pre-existing behaviour.
const GREETING = /^(hi|hey|hello|yo|sup|good (morning|afternoon|evening)|howdy)\b/;
/**
 * Continuations and acknowledgements. These carry no topic, so falling through
 * to the context summary makes the coach look like it restarted the
 * conversation — a bare "proceed" after a diet question would be answered with
 * the no-logs welcome instead. Anchored at both ends on purpose: an
 * acknowledgement is only topicless if it is the *whole* message, and `^ok\b`
 * would otherwise swallow "ok and what about protein?".
 */ const CONTINUATION = /^(ok(ay)?|k|kk|sure|yes|yeah|yep|thanks|thank you|ta|cheers|proceed|go on|go ahead|continue|next|and|why|really|hmm+|cool|nice|great|perfect|done)[?.!]*$/;
/** `diet|dite` also catches the common "dite" typo, which the context-only
    coach answered as a progress question. */ const NUTRITION = /\b(diet|dite|diets|nutrition|nutritional|meal|meals|macros?|calorie|calories|protein|carbs?|fats?|eat|eating|food|keto|supplement|bulk|bulking|cut|cutting|lean)\b/;
const HEALTH = /\b(injur\w*|pain|hurt|hurts|aching|sore|swelling|bleeding|dizzy|dizziness|numb\w*|tingl\w*|doctor|medical|physio\w*|hernia|tear|strain|sprain)\b/;
function normalise(message) {
    return message.toLowerCase().replace(/[^a-z0-9\s?]/g, ' ').replace(/\s+/g, ' ').trim();
}
function greetingReply(context) {
    const logged = context.workoutCount > 0;
    const summary = logged ? `You have ${context.workoutCount} logged workout(s) and ${context.totalSets} sets behind you, ` + `${describeWeight(context)}.` : 'You have not logged a workout yet, so the shortest session in the library is the place to start.';
    return `Hello, ${context.userName}. ${summary} ` + 'Ask me about your training, your diet plan, or how your week is going — ' + 'I answer from your logged sessions, volume and weight trend.';
}
function nutritionReply(context) {
    const weight = context.latestWeightKg;
    // Protein is the one target that is worth stating as a number, and it needs a
    // bodyweight to be meaningful.
    const protein = weight === null ? 'Record your bodyweight on the progress page and I can turn this into a real gram target.' : `At ${weight} kg that is ${Math.round(weight * 1.8)} g of protein a day as a starting point, ` + `spread across three or four meals rather than one.`;
    const goalAdvice = context.goal === 'cut' ? 'For a cut, hold protein fixed and trim 200–300 kcal, mostly from carbohydrates around training.' : context.goal === 'build' ? 'For a build, add 200–300 kcal and keep protein the same — the surplus should come from carbs and fats, not more protein.' : 'Keeping bodyweight steady, your calorie target sits near maintenance — watch the weekly weight trend and adjust from there.';
    return `On nutrition: ${protein} ${goalAdvice} ` + 'The app has full diet plans on the Nutrition page, broken down from breakfast through dinner with every swap listed, so start there and use this to adjust the numbers.';
}
function healthReply(context) {
    return 'Stop there — pain and injury are not something I should coach you through. ' + 'A sharp pain, swelling, numbness or loss of strength needs a doctor or a physiotherapist ' + 'before you train again, and I am not able to diagnose anything. ' + `In the meantime, ${context.userName}, drop the movement that hurts and keep training the rest.`;
}
function continuationReply(context) {
    return `I am not sure what you would like me to go on with, ${context.userName}. ` + 'Ask about your training, your diet plan, or how your week is going, and I will take it from there.';
}
function buildIntentReply(message, context) {
    const text = normalise(message);
    // Safety outranks every other topic: an injury question must never be
    // answered with a training or nutrition suggestion, however the rest reads.
    if (HEALTH.test(text)) return healthReply(context);
    if (GREETING.test(text)) return greetingReply(context);
    // Checked after health and nutrition so a real question that merely opens
    // with an acknowledgement still reaches its topic. CONTINUATION is anchored
    // at both ends, so "ok and what about protein?" cannot be swallowed here.
    if (CONTINUATION.test(text)) return continuationReply(context);
    if (NUTRITION.test(text)) return nutritionReply(context);
    return null;
}
class SimulatedCoachProvider {
    async reply(input) {
        // The message is what the user actually asked. Reading only the context
        // made every question return the same paragraph, which reads as a broken
        // coach rather than a limited one.
        const text = buildIntentReply(input.message, input.context) ?? buildContextReply(input.context);
        return {
            text,
            degraded: true
        };
    }
}
}),
"[project]/lib/services/tier.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "canViewWorkout",
    ()=>canViewWorkout,
    "isPremium",
    ()=>isPremium,
    "requirePremium",
    ()=>requirePremium,
    "visibleDietPlans",
    ()=>visibleDietPlans
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/http.ts [api] (ecmascript)");
;
function isPremium(user) {
    return user.subscriptionTier === 'premium';
}
function requirePremium(user) {
    if (!isPremium(user)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["ApiError"]('PREMIUM_REQUIRED', 'This feature requires a premium subscription', 403);
    }
}
function canViewWorkout(user, workout) {
    return !workout.isPremium || isPremium(user);
}
function visibleDietPlans(user, plans) {
    return plans.filter((plan)=>!plan.isPremium || isPremium(user));
}
}),
"[project]/lib/validation/schemas.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "bodyMetricSchema",
    ()=>bodyMetricSchema,
    "chatSchema",
    ()=>chatSchema,
    "checkoutSchema",
    ()=>checkoutSchema,
    "logSetSchema",
    ()=>logSetSchema,
    "logWorkoutSchema",
    ()=>logWorkoutSchema,
    "loginSchema",
    ()=>loginSchema,
    "onboardingSchema",
    ()=>onboardingSchema,
    "signupSchema",
    ()=>signupSchema
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__ = __turbopack_context__.i("[externals]/zod [external] (zod, esm_import, [project]/node_modules/zod)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__
]);
[__TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
const signupSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().email('Enter a valid email'),
    password: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().min(8, 'Password must be at least 8 characters'),
    name: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().min(1, 'Name is required')
});
const loginSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    email: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().email('Enter a valid email'),
    password: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().min(1, 'Password is required')
});
const onboardingSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    goal: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].enum([
        'cut',
        'maintain',
        'bulk'
    ]),
    weightKg: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().positive().max(400),
    experienceLevel: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].enum([
        'beginner',
        'intermediate',
        'advanced'
    ])
});
const logWorkoutSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    durationMin: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().int().positive().max(600),
    notes: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().max(2000).optional()
});
const logSetSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    setNumber: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().int().positive(),
    reps: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().int().positive().max(1000),
    weightKg: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().nonnegative().max(1000).optional()
});
const bodyMetricSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    weightKg: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().positive().max(400).optional(),
    bodyFatPct: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].number().min(1).max(70).optional()
});
const chatSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    message: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].string().min(1).max(4000)
});
const checkoutSchema = __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].object({
    tier: __TURBOPACK__imported__module__$5b$externals$5d2f$zod__$5b$external$5d$__$28$zod$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$zod$29$__["z"].enum([
        'premium'
    ])
});
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/pages/api/ai/chat.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {
__turbopack_context__.s([
    "default",
    ()=>handler
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$tier$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/tier.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$context$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coach/context.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/services/coach/simulated.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$index$2e$ts__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/lib/services/coach/index.ts [api] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/rate-limit.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2f$schemas$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/validation/schemas.ts [api] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/http.ts [api] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$api$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$context$2e$ts__$5b$api$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$index$2e$ts__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2f$schemas$2e$ts__$5b$api$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$api$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$context$2e$ts__$5b$api$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$index$2e$ts__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2f$schemas$2e$ts__$5b$api$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
;
;
;
;
/** Each call costs a model round trip, so the ceiling is per user rather than per IP. */ const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;
const HISTORY_LIMIT = 20;
const limiter = new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$rate$2d$limit$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["RateLimiter"]({
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS
});
async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["fail"])('METHOD_NOT_ALLOWED', 'Use POST'));
    const user = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["getCurrentUser"])(req);
    if (!user) return res.status(401).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["fail"])('UNAUTHORISED', 'Sign in to use the coach'));
    try {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$tier$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["requirePremium"])(user);
    } catch  {
        return res.status(403).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["fail"])('PREMIUM_REQUIRED', 'The AI coach requires a premium subscription'));
    }
    if (!limiter.check(user.id)) {
        return res.status(429).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["fail"])('RATE_LIMITED', 'Too many messages — take a moment'));
    }
    const parsed = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$validation$2f$schemas$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["chatSchema"].safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["fail"])('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'));
    }
    const { message } = parsed.data;
    const context = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$context$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["buildCoachContext"])(user.id);
    const history = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].coachMessage.findMany({
        where: {
            userId: user.id
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: HISTORY_LIMIT,
        select: {
            role: true,
            content: true
        }
    });
    // The query is newest-first, but the model needs the conversation in order.
    const orderedHistory = history.reverse().filter((entry)=>entry.role === 'user' || entry.role === 'assistant');
    const input = {
        message,
        context,
        history: orderedHistory
    };
    let answer;
    try {
        answer = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$index$2e$ts__$5b$api$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getCoachProvider"])().reply(input);
    } catch  {
        // A provider failure must never dead-end the chat panel. The fallback is
        // still marked degraded so the UI can say the model was not reached.
        answer = await new __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$services$2f$coach$2f$simulated$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["SimulatedCoachProvider"]().reply(input);
    }
    // Identity comes from the session only — a userId in the body is ignored.
    await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].$transaction([
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].coachMessage.create({
            data: {
                userId: user.id,
                role: 'user',
                content: message
            }
        }),
        __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["prisma"].coachMessage.create({
            data: {
                userId: user.id,
                role: 'assistant',
                content: answer.text
            }
        })
    ]);
    return res.status(200).json((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$http$2e$ts__$5b$api$5d$__$28$ecmascript$29$__["ok"])({
        reply: answer.text,
        degraded: answer.degraded
    }));
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1zx0gbm._.js.map