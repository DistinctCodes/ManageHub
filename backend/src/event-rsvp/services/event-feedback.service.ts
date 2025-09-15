import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { EventFeedback, FeedbackStatus } from '../entities/event-feedback.entity';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { CreateEventFeedbackDto } from '../dto/create-event-feedback.dto';

export interface FeedbackAnalytics {
  totalFeedbacks: number;
  averageOverallRating: number;
  averageContentRating: number;
  averageOrganizationRating: number;
  averageVenueRating: number;
  recommendationRate: number;
  attendAgainRate: number;
  responseRate: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  commonKeywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface EventFeedbackSummary {
  eventId: string;
  eventTitle: string;
  totalFeedbacks: number;
  averageRating: number;
  recommendationRate: number;
  responseRate: number;
  lastFeedbackDate: Date;
}

@Injectable()
export class EventFeedbackService {
  private readonly logger = new Logger(EventFeedbackService.name);

  constructor(
    @InjectRepository(EventFeedback)
    private feedbackRepository: Repository<EventFeedback>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(EventRsvp)
    private rsvpRepository: Repository<EventRsvp>,
  ) {}

  async createFeedback(createFeedbackDto: CreateEventFeedbackDto): Promise<EventFeedback> {
    // Verify event exists
    const event = await this.eventRepository.findOne({
      where: { id: createFeedbackDto.eventId }
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if event has ended
    if (event.endDate && event.endDate > new Date()) {
      throw new BadRequestException('Cannot submit feedback for an event that has not ended');
    }

    // Verify RSVP if provided
    let rsvp: EventRsvp | null = null;
    if (createFeedbackDto.rsvpId) {
      rsvp = await this.rsvpRepository.findOne({
        where: { 
          id: createFeedbackDto.rsvpId,
          eventId: createFeedbackDto.eventId
        }
      });

      if (!rsvp) {
        throw new NotFoundException('RSVP not found for this event');
      }
    }

    // Check for duplicate feedback
    const existingFeedback = await this.feedbackRepository.findOne({
      where: {
        eventId: createFeedbackDto.eventId,
        attendeeEmail: createFeedbackDto.attendeeEmail
      }
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback already submitted for this event');
    }

    const feedback = this.feedbackRepository.create({
      ...createFeedbackDto,
      status: FeedbackStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    const savedFeedback = await this.feedbackRepository.save(feedback);

    this.logger.log(`Feedback submitted for event ${event.title} by ${createFeedbackDto.attendeeEmail}`);

    return savedFeedback;
  }

  async getFeedbacksByEvent(eventId: string): Promise<EventFeedback[]> {
    return this.feedbackRepository.find({
      where: { eventId },
      relations: ['event', 'rsvp'],
      order: { submittedAt: 'DESC' }
    });
  }

  async getFeedbackById(id: string): Promise<EventFeedback> {
    const feedback = await this.feedbackRepository.findOne({
      where: { id },
      relations: ['event', 'rsvp']
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async updateFeedbackStatus(
    id: string, 
    status: FeedbackStatus, 
    reviewedBy?: string, 
    reviewNotes?: string
  ): Promise<EventFeedback> {
    const feedback = await this.getFeedbackById(id);

    feedback.status = status;
    if (status === FeedbackStatus.REVIEWED) {
      feedback.reviewedAt = new Date();
      feedback.reviewedBy = reviewedBy;
      feedback.reviewNotes = reviewNotes;
    }

    return this.feedbackRepository.save(feedback);
  }

  async deleteFeedback(id: string): Promise<void> {
    const result = await this.feedbackRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Feedback not found');
    }
  }

  async getEventFeedbackAnalytics(eventId: string): Promise<FeedbackAnalytics> {
    const feedbacks = await this.feedbackRepository.find({
      where: { 
        eventId,
        status: Not(FeedbackStatus.PENDING)
      }
    });

    if (feedbacks.length === 0) {
      return this.getEmptyAnalytics();
    }

    // Get total RSVPs for response rate calculation
    const totalRsvps = await this.rsvpRepository.count({
      where: { eventId }
    });

    const analytics: FeedbackAnalytics = {
      totalFeedbacks: feedbacks.length,
      averageOverallRating: this.calculateAverageRating(feedbacks, 'overallRating'),
      averageContentRating: this.calculateAverageRating(feedbacks, 'contentRating'),
      averageOrganizationRating: this.calculateAverageRating(feedbacks, 'organizationRating'),
      averageVenueRating: this.calculateAverageRating(feedbacks, 'venueRating'),
      recommendationRate: this.calculatePercentage(feedbacks, 'wouldRecommend'),
      attendAgainRate: this.calculatePercentage(feedbacks, 'wouldAttendAgain'),
      responseRate: totalRsvps > 0 ? (feedbacks.length / totalRsvps) * 100 : 0,
      ratingDistribution: this.calculateRatingDistribution(feedbacks),
      commonKeywords: this.extractCommonKeywords(feedbacks),
      sentiment: this.analyzeSentiment(feedbacks),
    };

    return analytics;
  }

  async getFeedbackSummaryByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<EventFeedbackSummary[]> {
    const events = await this.eventRepository.find({
      where: {
        startDate: Between(startDate, endDate)
      }
    });

    const summaries: EventFeedbackSummary[] = [];

    for (const event of events) {
      const feedbacks = await this.feedbackRepository.find({
        where: { 
          eventId: event.id,
          status: Not(FeedbackStatus.PENDING)
        },
        order: { submittedAt: 'DESC' }
      });

      const totalRsvps = await this.rsvpRepository.count({
        where: { eventId: event.id }
      });

      const averageRating = feedbacks.length > 0 
        ? feedbacks.reduce((sum, f) => sum + (f.averageRating || 0), 0) / feedbacks.length
        : 0;

      const recommendationRate = feedbacks.length > 0
        ? (feedbacks.filter(f => f.wouldRecommend).length / feedbacks.length) * 100
        : 0;

      summaries.push({
        eventId: event.id,
        eventTitle: event.title,
        totalFeedbacks: feedbacks.length,
        averageRating,
        recommendationRate,
        responseRate: totalRsvps > 0 ? (feedbacks.length / totalRsvps) * 100 : 0,
        lastFeedbackDate: feedbacks.length > 0 ? feedbacks[0].submittedAt : null,
      });
    }

    return summaries.sort((a, b) => b.averageRating - a.averageRating);
  }

  async getPendingFeedbacks(): Promise<EventFeedback[]> {
    return this.feedbackRepository.find({
      where: { status: FeedbackStatus.PENDING },
      relations: ['event', 'rsvp'],
      order: { createdAt: 'DESC' }
    });
  }

  async getTopRatedEvents(limit: number = 10): Promise<EventFeedbackSummary[]> {
    const query = `
      SELECT 
        e.id as eventId,
        e.title as eventTitle,
        COUNT(ef.id) as totalFeedbacks,
        AVG(
          COALESCE(ef.overallRating, 0) + 
          COALESCE(ef.contentRating, 0) + 
          COALESCE(ef.organizationRating, 0) + 
          COALESCE(ef.venueRating, 0)
        ) / 4 as averageRating,
        (COUNT(CASE WHEN ef.wouldRecommend = 1 THEN 1 END) * 100.0 / COUNT(ef.id)) as recommendationRate,
        MAX(ef.submittedAt) as lastFeedbackDate
      FROM events e
      LEFT JOIN event_feedback ef ON e.id = ef.eventId
      WHERE ef.status != 'pending'
      GROUP BY e.id, e.title
      HAVING COUNT(ef.id) >= 3
      ORDER BY averageRating DESC, totalFeedbacks DESC
      LIMIT ?
    `;

    const results = await this.feedbackRepository.query(query, [limit]);
    
    return results.map(result => ({
      eventId: result.eventId,
      eventTitle: result.eventTitle,
      totalFeedbacks: parseInt(result.totalFeedbacks),
      averageRating: parseFloat(result.averageRating) || 0,
      recommendationRate: parseFloat(result.recommendationRate) || 0,
      responseRate: 0, // Would need additional query
      lastFeedbackDate: result.lastFeedbackDate,
    }));
  }

  private calculateAverageRating(feedbacks: EventFeedback[], field: keyof EventFeedback): number {
    const ratings = feedbacks
      .map(f => f[field] as number)
      .filter(rating => rating !== null && rating !== undefined);
    
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  }

  private calculatePercentage(feedbacks: EventFeedback[], field: keyof EventFeedback): number {
    const total = feedbacks.length;
    if (total === 0) return 0;
    
    const positive = feedbacks.filter(f => f[field] === true).length;
    return (positive / total) * 100;
  }

  private calculateRatingDistribution(feedbacks: EventFeedback[]): { 1: number; 2: number; 3: number; 4: number; 5: number; } {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    feedbacks.forEach(feedback => {
      const rating = Math.round(feedback.averageRating || 0);
      if (rating >= 1 && rating <= 5) {
        distribution[rating as keyof typeof distribution]++;
      }
    });

    return distribution;
  }

  private extractCommonKeywords(feedbacks: EventFeedback[]): string[] {
    const allText = feedbacks
      .map(f => [f.comments, f.suggestions, f.whatWorkedWell, f.whatCouldImprove].filter(Boolean).join(' '))
      .join(' ');

    if (!allText) return [];

    // Simple keyword extraction
    const words = allText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private analyzeSentiment(feedbacks: EventFeedback[]): 'positive' | 'neutral' | 'negative' {
    if (feedbacks.length === 0) return 'neutral';

    const averageRating = feedbacks.reduce((sum, f) => sum + (f.averageRating || 0), 0) / feedbacks.length;
    const recommendationRate = this.calculatePercentage(feedbacks, 'wouldRecommend');

    if (averageRating >= 4 && recommendationRate >= 70) return 'positive';
    if (averageRating <= 2.5 || recommendationRate <= 30) return 'negative';
    return 'neutral';
  }

  private getEmptyAnalytics(): FeedbackAnalytics {
    return {
      totalFeedbacks: 0,
      averageOverallRating: 0,
      averageContentRating: 0,
      averageOrganizationRating: 0,
      averageVenueRating: 0,
      recommendationRate: 0,
      attendAgainRate: 0,
      responseRate: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      commonKeywords: [],
      sentiment: 'neutral',
    };
  }
}