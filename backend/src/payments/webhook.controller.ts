import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { Public } from "../auth/decorators/public.decorator"; // assumes you have a @Public decorator
import { HandleWebhookProvider } from "./providers/handle-webhook.provider";
import { ConfigService } from "@nestjs/config";

@Controller("payments")
export class WebhookController {
  constructor(
    private readonly handleWebhookProvider: HandleWebhookProvider,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("webhook")
  async handleWebhook(
    @Req() req: any,
    @Res() res: any,
    @Headers("x-paystack-signature") signature: string,
  ) {
    const secret = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    const rawBody = req.rawBody; // must be captured by middleware

    try {
      this.handleWebhookProvider.verifySignature(rawBody, signature, secret);
    } catch (err) {
      throw new UnauthorizedException("Invalid signature");
    }

    const result = await this.handleWebhookProvider.handleEvent(req.body);
    return res.status(200).json(result);
  }
}
