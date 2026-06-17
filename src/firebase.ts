import { initializeApp } from 'firebase/app'
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    query,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore'

const firebaseConfig = {
    apiKey: '<YOUR_API_KEY>',
    authDomain: '<YOUR_AUTH_DOMAIN>',
    projectId: '<YOUR_PROJECT_ID>',
    storageBucket: '<YOUR_STORAGE_BUCKET>',
    messagingSenderId: '<YOUR_MESSAGING_SENDER_ID>',
    appId: '<YOUR_APP_ID>',
}

const isFirebaseConfigured = Object.values(firebaseConfig).every(
    (value) => typeof value === 'string' && value.trim() !== '' && !value.includes('<YOUR_'),
)

let usersCollection: ReturnType<typeof collection> | null = null
let servicesCollection: ReturnType<typeof collection> | null = null

if (isFirebaseConfigured) {
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)
    usersCollection = collection(db, 'users')
    servicesCollection = collection(db, 'services')
} else {
    console.warn('Firebase não está configurado. Usando fallback localStorage para desenvolvimento.')
}

export type User = {
    nome: string
    email: string
    telefone: string
    senha: string
    tipo: 'contratante' | 'contratado'
    pixKey?: string
}

export type ServiceItem = {
    id: string
    servico: string
    fotoNome: string
    fotoUrl: string
    valor: string
    createdAt: string
    createdAtISO?: string
    status: 'aberto' | 'pago'
    nomeContratado?: string
    emailContratado?: string
}

function readLocalUsers(): User[] {
    const stored = window.localStorage.getItem('cadastroUsers')
    if (!stored) return []
    try {
        return JSON.parse(stored) as User[]
    } catch {
        return []
    }
}

function saveLocalUsers(users: User[]) {
    window.localStorage.setItem('cadastroUsers', JSON.stringify(users))
}

function readLocalServices(email: string): ServiceItem[] {
    const stored = window.localStorage.getItem(`serviceHistory_${email}`)
    if (!stored) return []
    try {
        return JSON.parse(stored) as ServiceItem[]
    } catch {
        return []
    }
}

function saveLocalServices(email: string, services: ServiceItem[]) {
    try {
        window.localStorage.setItem(`serviceHistory_${email}`, JSON.stringify(services))
    } catch (e) {
        if (e instanceof Error && e.message.includes('QuotaExceededError')) {
            console.error('localStorage cheio! Remova imagens antigas ou aumente o espaço disponível.')
            throw new Error('Espaço insuficiente. Remova imagens ou serviços antigos.')
        }
        throw e
    }
}

function getLocalServiceById(id: string): { service: ServiceItem | null; contractorEmail: string | null } {
    const users = readLocalUsers()
    for (const user of users.filter((u) => u.tipo === 'contratado')) {
        const services = readLocalServices(user.email)
        const found = services.find((service) => service.id === id)
        if (found) return { service: found, contractorEmail: user.email }
    }
    return { service: null, contractorEmail: null }
}

export async function getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null
    if (!isFirebaseConfigured || !usersCollection) {
        return readLocalUsers().find((user) => user.email === email) ?? null
    }
    const docRef = doc(usersCollection, email)
    const snapshot = await getDoc(docRef)
    return snapshot.exists() ? (snapshot.data() as User) : null
}

export async function getUserByEmailAndPassword(email: string, senha: string): Promise<User | null> {
    const user = await getUserByEmail(email)
    if (!user) return null
    return user.senha === senha ? user : null
}

export async function createUser(user: User): Promise<void> {
    if (!isFirebaseConfigured || !usersCollection) {
        const users = readLocalUsers()
        saveLocalUsers([...users, user])
        return
    }
    await setDoc(doc(usersCollection, user.email), user)
}

export async function updateUserPixKey(email: string, pixKey: string): Promise<void> {
    if (!isFirebaseConfigured || !usersCollection) {
        const users = readLocalUsers().map((user) => (user.email === email ? { ...user, pixKey } : user))
        saveLocalUsers(users)
        return
    }
    const userRef = doc(usersCollection, email)
    await updateDoc(userRef, { pixKey })
}

export async function getServicesForContractor(email: string): Promise<ServiceItem[]> {
    if (!email) return []
    if (!isFirebaseConfigured || !servicesCollection) {
        return readLocalServices(email)
    }
    const q = query(servicesCollection, where('emailContratado', '==', email))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ServiceItem, 'id'>) }))
}

export async function getAllContractorServices(): Promise<ServiceItem[]> {
    if (!isFirebaseConfigured || !servicesCollection) {
        const users = readLocalUsers().filter((user) => user.tipo === 'contratado')
        const services: ServiceItem[] = []
        users.forEach((contractor) => {
            readLocalServices(contractor.email).forEach((service) => {
                services.push({ ...service, nomeContratado: contractor.nome, emailContratado: contractor.email })
            })
        })
        return services
    }
    const snapshot = await getDocs(servicesCollection)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ServiceItem, 'id'>) }))
}

export async function saveServiceItem(service: Omit<ServiceItem, 'id'> & { id?: string }): Promise<string> {
    if (!isFirebaseConfigured || !servicesCollection) {
        const contractorEmail = service.emailContratado || ''
        const services = readLocalServices(contractorEmail)
        const generateUniqueId = () => {
            let id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            // Garante que o ID é único mesmo com collisions de timestamp
            while (services.some((s) => s.id === id)) {
                id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            }
            return id
        }
        const id = service.id || generateUniqueId()
        const updated = services.filter((s) => s.id !== id)
        saveLocalServices(contractorEmail, [{ ...service, id }, ...updated])
        return id
    }

    if (service.id) {
        const serviceRef = doc(servicesCollection, service.id)
        await setDoc(serviceRef, service)
        return service.id
    }

    const newServiceRef = doc(servicesCollection)
    await setDoc(newServiceRef, { ...service, status: service.status || 'aberto' })
    return newServiceRef.id
}

export async function updateServiceStatus(id: string, status: 'aberto' | 'pago'): Promise<void> {
    if (!isFirebaseConfigured || !servicesCollection) {
        const { service, contractorEmail } = getLocalServiceById(id)
        if (!service || !contractorEmail) return
        const updatedServices = readLocalServices(contractorEmail).map((s) => (s.id === id ? { ...s, status } : s))
        saveLocalServices(contractorEmail, updatedServices)
        return
    }
    const serviceRef = doc(servicesCollection, id)
    await updateDoc(serviceRef, { status })
}

export async function deleteServiceItem(id: string): Promise<void> {
    if (!isFirebaseConfigured || !servicesCollection) {
        const { contractorEmail } = getLocalServiceById(id)
        if (!contractorEmail) return
        const updatedServices = readLocalServices(contractorEmail).filter((service) => service.id !== id)
        saveLocalServices(contractorEmail, updatedServices)
        return
    }
    await deleteDoc(doc(servicesCollection, id))
}

export async function removeServicePhoto(id: string): Promise<void> {
    if (!isFirebaseConfigured || !servicesCollection) {
        const { service, contractorEmail } = getLocalServiceById(id)
        if (!service || !contractorEmail) return
        const updatedServices = readLocalServices(contractorEmail).map((s) =>
            s.id === id ? { ...s, fotoUrl: '', fotoNome: 'Sem foto' } : s
        )
        saveLocalServices(contractorEmail, updatedServices)
        return
    }
    const serviceRef = doc(servicesCollection, id)
    await updateDoc(serviceRef, { fotoUrl: '', fotoNome: 'Sem foto' })
}
