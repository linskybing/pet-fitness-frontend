// API Base URL
// Use proxy in development and production (via Vercel rewrites) to avoid CORS issues
const API_BASE_URL = import.meta.env.DEV ? "/api" : "https://back-end-production-68f7.up.railway.app";

// ==================
// Types (matching backend schemas)
// ==================

export interface User {
    id: string;  // TownPass user ID (string)
    created_at: string;
    pet?: Pet;
    exercise_logs?: ExerciseLog[];
}

export interface UserCreate {
    pet_name: string;
    user_id?: string;  // TownPass user ID (optional for now, will be required later)
}

export interface Pet {
    id: number;
    owner_id: string;  // References User.id which is a string
    name: string;
    strength: number;
    stamina: number;
    mood: number;
    level: number;
    stage: number;
    breakthrough_completed: boolean;
    updated_at: string;
    last_daily_check?: string | null;
}

export interface PetUpdate {
    name?: string;
    strength?: number;
    stamina?: number;
    mood?: number;
    level?: number;
    stage?: number;
    breakthrough_completed?: boolean;
}

export interface ExerciseLog {
    id: number;
    exercise_type: string;
    duration_seconds: number;
    volume: number;
    created_at: string;
    user_id: string;  // References User.id which is a string
    pet_id: number;
}

export interface ExerciseLogCreate {
    exercise_type: string;
    duration_seconds: number;
    volume: number;
}

export interface ExerciseResult {
    pet: Pet;
    breakthrough_required: boolean;
    message?: string;
}

export interface Quest {
    id: number;
    title: string;
    description: string;
    reward_strength: number;
    reward_stamina: number;
    reward_mood: number;
}

export interface UserQuest {
    id: number;
    user_id: string;  // References User.id which is a string
    quest_id: number;
    is_completed: boolean;
    date: string;
    quest: Quest;
}

export interface Attraction {
    id: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    image_url?: string;
}

export interface LeaderboardEntry {
    username: string;
    value: number;
}

export interface DailyCheckResult {
    pet: Pet;
    exercised_enough: boolean;
    message: string;
}

export interface BreakthroughResult {
    success: boolean;
    pet: Pet;
    message: string;
}

export interface TravelCheckin {
    id: number;
    user_id: string;  // References User.id which is a string
    quest_id: string;
    completed_at: string;
    lat: number;
    lng: number;
}

export interface TravelCheckinCreate {
    quest_id: string;
    lat: number;
    lng: number;
}

// ==================
// API Functions
// ==================

// User & Auth
export async function createUser(pet_name: string, townpass_id?: string): Promise<User> {
    const body: UserCreate = { pet_name };
    if (townpass_id) {
        body.user_id = townpass_id;
    }

    const response = await fetch(`${API_BASE_URL}/users/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create user");
    }
    return response.json();
}

export async function getUser(userId: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get user");
    }
    return response.json();
}

// Pet
export async function getUserPet(userId: string): Promise<Pet> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/pet`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get pet");
    }
    return response.json();
}

export async function updateUserPet(userId: string, petUpdate: PetUpdate): Promise<Pet> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/pet`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(petUpdate),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to update pet");
    }
    return response.json();
}

// Exercise
export async function logExercise(userId: string, log: ExerciseLogCreate): Promise<ExerciseResult> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/exercise`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to log exercise");
    }
    return response.json();
}

// Daily Quests
export async function getDailyQuests(userId: string): Promise<UserQuest[]> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/quests`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get daily quests");
    }
    return response.json();
}

export async function completeDailyQuest(userId: string, userQuestId: number): Promise<ExerciseResult> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/quests/${userQuestId}/complete`, {
        method: "POST",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to complete quest");
    }
    return response.json();
}

// Daily Check
export async function performDailyCheck(userId: string): Promise<DailyCheckResult> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/daily-check`, {
        method: "POST",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to perform daily check");
    }
    return response.json();
}

// Travel (Breakthrough)
export async function getAllAttractions(): Promise<Attraction[]> {
    const response = await fetch(`${API_BASE_URL}/travel/attractions`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get attractions");
    }
    return response.json();
}

export async function startTravelQuest(userId: string): Promise<Attraction> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/travel/start`, {
        method: "POST",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to start travel quest");
    }
    return response.json();
}

export async function completeBreakthrough(userId: string): Promise<BreakthroughResult> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/travel/breakthrough`, {
        method: "POST",
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to complete breakthrough");
    }
    return response.json();
}

// Travel Checkins (Location-based quests)
export async function getUserTravelCheckins(userId: string): Promise<TravelCheckin[]> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/travel/checkins`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get travel checkins");
    }
    return response.json();
}

export async function createTravelCheckin(userId: string, checkin: TravelCheckinCreate): Promise<{ pet: Pet; checkin: TravelCheckin }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/travel/checkins`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(checkin),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create travel checkin");
    }
    return response.json();
}

// Leaderboard
export async function getLevelLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${API_BASE_URL}/leaderboard/level?limit=${limit}`);
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to get leaderboard");
    }
    return response.json();
}

// Helper function to map stage number to stage name
export function getStageName(stage: number): "egg" | "small" | "medium" | "large" | "buff" {
    const stageMap: Record<number, "egg" | "small" | "medium" | "large" | "buff"> = {
        0: "egg",
        1: "small",
        2: "medium",
        3: "large",
        4: "buff",
    };
    return stageMap[stage] || "small";
}
