import { NestFactory } from '@nestjs/core';
import prompt from 'prompt';
import { ClassTopicService } from 'src/api/service/class_topic.service';
import { Weekday } from 'src/api/types/weekday';
import { BaseModule } from 'src/base.module';

process.env.ALLOW_SCHEDULING = 'false';
process.env.REPL = 'true';
process.env.RECAPTCHA_SECRET_KEY ||= 'none';

function bootstrap(): void {
    if (!process.stdin.isTTY) {
        console.log('Must be run interactively');

        return;
    }

    prompt.start();

    prompt.get(
        [
            {
                name: 'classIds',
                description: 'Class IDs to change (Ctrl-C to finish)',
                required: true,
                type: 'array'
            },
            {
                name: 'newReadingStartDay',
                description: 'New start day for reading log (1 = Monday, 7 = Sunday)',
                required: true,
                type: 'number'
            }
        ],
        // We don't actually care about the result of this being parsed by prompt:
        // it shouldn't be doing that anyway. This code is CLI-run, so if it
        // crashes, it crashes; it doesn't affect the rest of the app.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async (err, result) => {
            if (err) {
                console.log(err);

                return;
            }

            const app = await NestFactory.createApplicationContext(BaseModule);
            const newReadingStartDay = parseInt(result.newReadingStartDay as string) as Weekday;
            const classTopicService = app.get(ClassTopicService);

            await classTopicService.updateClassReadingWeekStartDay(result.classIds as string[], newReadingStartDay);

            process.exit();
        }
    );
}

bootstrap();
