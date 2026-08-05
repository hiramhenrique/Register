import type { ServiceItem } from './firebase'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
})

function parseLegacyPtBrDate(value: string): Date | null {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/)
    if (!match) return null

    const [, day, month, year, hour = '0', minute = '0', second = '0'] = match
    const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
    )

    return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function getServiceDate(service: Pick<ServiceItem, 'createdAt' | 'createdAtISO'>): Date {
    if (service.createdAtISO) {
        const isoDate = new Date(service.createdAtISO)
        if (!Number.isNaN(isoDate.getTime())) return isoDate
    }

    const legacyDate = parseLegacyPtBrDate(service.createdAt)
    if (legacyDate) return legacyDate

    const fallbackDate = new Date(service.createdAt)
    if (!Number.isNaN(fallbackDate.getTime())) return fallbackDate

    return new Date(0)
}

export function getServiceTimestamp(service: Pick<ServiceItem, 'createdAt' | 'createdAtISO'>): number {
    return getServiceDate(service).getTime()
}

export function formatServiceDay(service: Pick<ServiceItem, 'createdAt' | 'createdAtISO'>): string {
    const date = getServiceDate(service)
    if (date.getTime() === 0 && service.createdAt) {
        return service.createdAt.split(',')[0] || service.createdAt
    }

    return dateFormatter.format(date)
}

export function formatServiceDateTime(service: Pick<ServiceItem, 'createdAt' | 'createdAtISO'>): string {
    const date = getServiceDate(service)
    if (date.getTime() === 0 && service.createdAt) {
        return service.createdAt
    }

    return dateTimeFormatter.format(date)
}