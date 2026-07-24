import { initializeApp } from 'firebase/app'
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    onSnapshot,
    query,
    setDoc,
    updateDoc,
    where,
    type Unsubscribe,
} from 'firebase/firestore'
const firebaseConfig = {
    apiKey: 'AIzaSyA-XeKQMYFJEunJ_5SfW4JUQs1RxktvQa8',
    authDomain: 'comissoes-5a956.firebaseapp.com',
    projectId: 'comissoes-5a956',
    storageBucket: 'comissoes-5a956.firebasestorage.app',
    messagingSenderId: '380142535161',
    appId: '1:380142535161:web:9c20919c7c135215b33d28',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const usersCollection = collection(db, 'users')
const servicesCollection = collection(db, 'services')

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

export function subscribeToAllServices(
    callback: (services: ServiceItem[]) => void,
): Unsubscribe {
    return onSnapshot(servicesCollection, (snapshot) => {
        const services = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ServiceItem, 'id'>),
        }))
        callback(services)
    })
}

export function subscribeToContractorServices(
    email: string,
    callback: (services: ServiceItem[]) => void,
): Unsubscribe {
    const q = query(servicesCollection, where('emailContratado', '==', email))
    return onSnapshot(q, (snapshot) => {
        const services = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ServiceItem, 'id'>),
        }))
        callback(services)
    })
}

export async function getUserByEmail(email: string): Promise<User | null> {
    if (!email) return null
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
    await setDoc(doc(usersCollection, user.email), user)
}

export async function updateUserPixKey(email: string, pixKey: string): Promise<void> {
    await updateDoc(doc(usersCollection, email), { pixKey })
}

export async function getServicesForContractor(email: string): Promise<ServiceItem[]> {
    if (!email) return []
    const q = query(servicesCollection, where('emailContratado', '==', email))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<ServiceItem, 'id'>) }))
}

export async function saveServiceItem(service: Omit<ServiceItem, 'id'> & { id?: string }): Promise<string> {
    if (service.id) {
        await setDoc(doc(servicesCollection, service.id), service)
        return service.id
    }
    const newRef = doc(servicesCollection)
    await setDoc(newRef, { ...service, status: service.status || 'aberto' })
    return newRef.id
}

export async function updateServiceStatus(id: string, status: 'aberto' | 'pago'): Promise<void> {
    await updateDoc(doc(servicesCollection, id), { status })
}

export async function deleteServiceItem(id: string): Promise<void> {
    await deleteDoc(doc(servicesCollection, id))
}

export async function removeServicePhoto(id: string): Promise<void> {
    await updateDoc(doc(servicesCollection, id), { fotoUrl: '', fotoNome: 'Sem foto' })
}
