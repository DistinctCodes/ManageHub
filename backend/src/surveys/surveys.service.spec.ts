import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurveysService } from './surveys.service';
import { Survey } from './entities/survey.entity';
import { Question, QuestionType } from './entities/question.entity';
import { Response } from './entities/response.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('SurveysService', () => {
  let service: SurveysService;
  let surveyRepository: MockRepository<Survey>;
  let questionRepository: MockRepository<Question>;
  let responseRepository: MockRepository<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SurveysService,
        {
          provide: getRepositoryToken(Survey),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Question),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Response),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SurveysService>(SurveysService);
    surveyRepository = module.get<MockRepository<Survey>>(getRepositoryToken(Survey));
    questionRepository = module.get<MockRepository<Question>>(getRepositoryToken(Question));
    responseRepository = module.get<MockRepository<Response>>(getRepositoryToken(Response));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a survey with questions', async () => {
      const createSurveyDto = {
        title: 'Test Survey',
        description: 'A test survey',
        createdBy: 'admin',
        questions: [
          {
            text: 'Question 1',
            type: QuestionType.TEXT,
            isRequired: true,
          },
        ],
      };

      const savedSurvey = {
        id: 'survey-uuid',
        ...createSurveyDto,
        questions: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedQuestions = [
        {
          id: 'question-uuid',
          text: 'Question 1',
          type: QuestionType.TEXT,
          isRequired: true,
          order: 0,
          surveyId: 'survey-uuid',
          survey: savedSurvey,
        },
      ];

      const surveyWithQuestions = {
        ...savedSurvey,
        questions: savedQuestions,
      };

      surveyRepository.create.mockReturnValue(savedSurvey);
      surveyRepository.save.mockResolvedValue(savedSurvey);
      questionRepository.create.mockReturnValue(savedQuestions[0]);
      questionRepository.save.mockResolvedValue(savedQuestions);
      surveyRepository.findOne.mockResolvedValue(surveyWithQuestions);

      const result = await service.create(createSurveyDto);

      expect(surveyRepository.create).toHaveBeenCalled();
      expect(surveyRepository.save).toHaveBeenCalled();
      expect(questionRepository.create).toHaveBeenCalled();
      expect(questionRepository.save).toHaveBeenCalled();
      expect(surveyRepository.findOne).toHaveBeenCalled();
      expect(result).toEqual(surveyWithQuestions);
    });
  });

  describe('findOne', () => {
    it('should return a survey by id', async () => {
      const surveyId = 'survey-uuid';
      const expectedSurvey = {
        id: surveyId,
        title: 'Test Survey',
        questions: [
          { id: 'q1', text: 'Question 1', order: 1 },
          { id: 'q2', text: 'Question 2', order: 0 },
        ],
      };

      surveyRepository.findOne.mockResolvedValue(expectedSurvey);

      const result = await service.findOne(surveyId);

      expect(surveyRepository.findOne).toHaveBeenCalledWith({
        where: { id: surveyId },
        relations: ['questions'],
      });
      expect(result).toEqual({
        ...expectedSurvey,
        questions: [
          { id: 'q2', text: 'Question 2', order: 0 },
          { id: 'q1', text: 'Question 1', order: 1 },
        ],
      });
    });

    it('should throw NotFoundException when survey not found', async () => {
      const surveyId = 'non-existent-id';
      surveyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(surveyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('submitResponses', () => {
    it('should submit responses for a survey', async () => {
      const createResponseDto = {
        surveyId: 'survey-uuid',
        respondentId: 'user-123',
        responses: [
          {
            questionId: 'question-1',
            value: 'Answer to question 1',
          },
        ],
      };

      const survey = {
        id: 'survey-uuid',
        title: 'Test Survey',
        isActive: true,
        questions: [
          {
            id: 'question-1',
            text: 'Question 1',
            isRequired: true,
          },
        ],
      };

      surveyRepository.findOne.mockResolvedValue(survey);
      responseRepository.create.mockReturnValue({
        questionId: 'question-1',
        value: 'Answer to question 1',
        respondentId: 'user-123',
        question: survey.questions[0],
      });
      responseRepository.save.mockResolvedValue([]);

      await service.submitResponses(createResponseDto);

      expect(surveyRepository.findOne).toHaveBeenCalled();
      expect(responseRepository.create).toHaveBeenCalled();
      expect(responseRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when required question is not answered', async () => {
      const createResponseDto = {
        surveyId: 'survey-uuid',
        respondentId: 'user-123',
        responses: [],
      };

      const survey = {
        id: 'survey-uuid',
        title: 'Test Survey',
        isActive: true,
        questions: [
          {
            id: 'question-1',
            text: 'Question 1',
            isRequired: true,
          },
        ],
      };

      surveyRepository.findOne.mockResolvedValue(survey);

      await expect(service.submitResponses(createResponseDto)).rejects.toThrow(BadRequestException);
    });
  });
});
