import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ChatModule } from './chat/chat.module.js';

@Module({
  imports: [DatabaseModule, DocumentsModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
