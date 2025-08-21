import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './entities/survey.entity';
import { Question } from './entities/question.entity';
import { Response } from './entities/response.entity';
import { CreateSurveyDto, UpdateSurveyDto } from './dto/survey.dto';
import { CreateSurveyResponseDto } from './dto/response.dto';

@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveysRepository: Repository<Survey>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(Response)
    private responsesRepository: Repository<Response>,
  ) {}

  async create(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const { questions, ...surveyData } = createSurveyDto;
    
    // Create survey without questions first
    const survey = this.surveysRepository.create(surveyData);
    const savedSurvey = await this.surveysRepository.save(survey);
    
    // Create questions with reference to survey
    if (questions && questions.length > 0) {
      const questionEntities = questions.map((q, index) => {
        const question = this.questionsRepository.create({
          ...q,
          order: q.order ?? index,
          survey: savedSurvey,
          surveyId: savedSurvey.id,
        });
        return question;
      });
      
      await this.questionsRepository.save(questionEntities);
      
      // Reload survey with questions
      return this.findOne(savedSurvey.id);
    }
    
    return savedSurvey;
  }

  async findAll(activeOnly: boolean = false): Promise<Survey[]> {
    if (activeOnly) {
      return this.surveysRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    }
    return this.surveysRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Survey> {
    const survey = await this.surveysRepository.findOne({
      where: { id },
      relations: ['questions'],
    });
    
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }
    
    // Sort questions by order
    survey.questions.sort((a, b) => a.order - b.order);
    
    return survey;
  }

  async update(id: string, updateSurveyDto: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.findOne(id);
    
    // Update survey properties
    Object.assign(survey, updateSurveyDto);
    
    return this.surveysRepository.save(survey);
  }

  async remove(id: string): Promise<void> {
    const survey = await this.findOne(id);
    await this.surveysRepository.remove(survey);
  }

  async submitResponses(createResponseDto: CreateSurveyResponseDto): Promise<void> {
    const { surveyId, respondentId, responses } = createResponseDto;
    
    // Verify survey exists and is active
    const survey = await this.surveysRepository.findOne({
      where: { id: surveyId, isActive: true },
      relations: ['questions'],
    });
    
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found or is not active`);
    }
    
    // Create a map of question IDs for quick lookup
    const questionMap = new Map();
    survey.questions.forEach(q => questionMap.set(q.id, q));
    
    // Validate that all required questions are answered
    const requiredQuestions = survey.questions.filter(q => q.isRequired);
    const answeredQuestionIds = responses.map(r => r.questionId);
    
    const missingRequiredQuestions = requiredQuestions.filter(q => 
      !answeredQuestionIds.includes(q.id)
    );
    
    if (missingRequiredQuestions.length > 0) {
      throw new BadRequestException(
        `Missing responses for required questions: ${missingRequiredQuestions.map(q => q.text).join(', ')}`
      );
    }
    
    // Validate that all provided question IDs belong to this survey
    for (const response of responses) {
      if (!questionMap.has(response.questionId)) {
        throw new BadRequestException(`Question with ID ${response.questionId} does not belong to survey ${surveyId}`);
      }
    }
    
    // Save responses
    const responseEntities = responses.map(r => {
      return this.responsesRepository.create({
        questionId: r.questionId,
        value: r.value,
        respondentId,
        question: questionMap.get(r.questionId),
      });
    });
    
    await this.responsesRepository.save(responseEntities);
  }

  async getSurveyResponses(surveyId: string): Promise<any> {
    // Check if survey exists
    const survey = await this.findOne(surveyId);
    
    // Get all questions for the survey
    const questions = await this.questionsRepository.find({
      where: { surveyId: survey.id },
      relations: ['responses'],
    });
    
    // Transform the data into a more usable format
    const results = questions.map(question => {
      return {
        questionId: question.id,
        questionText: question.text,
        questionType: question.type,
        responses: question.responses.map(response => ({
          responseId: response.id,
          respondentId: response.respondentId,
          value: response.value,
          createdAt: response.createdAt,
        })),
      };
    });
    
    return {
      surveyId: survey.id,
      title: survey.title,
      description: survey.description,
      questions: results,
    };
  }
}
