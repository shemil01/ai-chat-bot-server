import { Controller, Post, Get, Param, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async uploadDocument(@UploadedFile() file: any) {
    // Logic to parse PDF and create embeddings will go here
    return { success: true, message: "Upload hit" };
  }

  @Get()
  async getDocuments() {
    return [];
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    return { success: true };
  }
}
