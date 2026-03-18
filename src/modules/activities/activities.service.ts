import { db } from '../../db';
import { assetActivities } from '../../db/schema';
import { desc } from 'drizzle-orm';

function timeAgo(dateString: string | number | Date): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
}

export class ActivitiesService {
    async getActivities() {
        const rawActivities = await db.select()
            .from(assetActivities)
            .orderBy(desc(assetActivities.createdAt))
            .limit(50);

        return rawActivities.map(a => ({
            id: a.id,
            type: a.type,
            title: a.title,
            desc: a.desc,
            time: timeAgo(a.createdAt),
            icon: a.icon,
            color: a.color,
            roles: a.roles,
            targetUserId: a.targetUserId,
            assetId: a.assetId,
            hasCTA: a.hasCTA,
            isRead: a.isRead
        }));
    }
}
