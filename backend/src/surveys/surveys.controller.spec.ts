import { Test, TestingModule } from '@nestjs/testing';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/survey.dto';
import { QuestionType } from './entities/question.entity';
import { CreateSurveyResponseDto } from './dto/response.dto';

describe('SurveysController', () => {
  let controller: SurveysController;
  let service: SurveysService;

  const mockSurveysService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submitResponses: jest.fn(),
    getSurveyResponses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SurveysController],
      providers: [
        {
          provide: SurveysService,
          useValue: mockSurveysService,
        },
      ],
    }).compile();

    controller = module.get<SurveysController>(SurveysController);
    service = module.get<SurveysService>(SurveysService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new survey', async () => {
      const createSurveyDto: CreateSurveyDto = {
        title: 'Test Survey',
        description: 'A test survey',
        createdBy: 'admin',
        questions: [
          {
            text: 'Question 1',
            type: QuestionType.TEXT,
            isRequired: true,
          },
          {
            text: 'Question 2',
            type: QuestionType.SINGLE_CHOICE,
            options: ['Option 1', 'Option 2'],
            isRequired: false,
          },
        ],
      };

      const expectedResult = {
        id: 'survey-uuid',
        ...createSurveyDto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'create').mockResolvedValue(expectedResult as any);

      const result = await controller.create(createSurveyDto);
      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(createSurveyDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of surveys', async () => {
      const expectedResult = [
        {
          id: 'survey-uuid-1',
          title: 'Survey 1',
          isActive: true,
        },
        {
          id: 'survey-uuid-2',
          title: 'Survey 2',
          isActive: false,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll();
      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should return only active surveys when active=true', async () => {
      const expectedResult = [
        {
          id: 'survey-uuid-1',
          title: 'Survey 1',
          isActive: true,
        },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(expectedResult as any);

      const result = await controller.findAll('true');
      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(true);
    });
  });

  describe('submitResponses', () => {
    it('should submit responses for a survey', async () => {
      const createResponseDto: CreateSurveyResponseDto = {
        surveyId: 'survey-uuid',
        respondentId: 'user-123',
        responses: [
          {
            questionId: 'question-1',
            value: 'Answer to question 1',
          },
          {
            questionId: 'question-2',
            value: 'Option 1',
          },
        ],
      };

      jest.spyOn(service, 'submitResponses').mockResolvedValue(undefined);

      await controller.submitResponses(createResponseDto);
      expect(service.submitResponses).toHaveBeenCalledWith(createResponseDto);
    });
  });
});
