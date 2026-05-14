import { Response } from 'express';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(res: Response, data: T, message?: string, statusCode = 200) {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(statusCode).json(body);
}

export function paginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export function created<T>(res: Response, data: T, message = 'Created successfully') {
  success(res, data, message, 201);
}

export function noContent(res: Response) {
  res.status(204).send();
}

export function badRequest(res: Response, message = 'Bad request') {
  res.status(400).json({ success: false, message });
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  res.status(401).json({ success: false, message });
}

export function forbidden(res: Response, message = 'Forbidden') {
  res.status(403).json({ success: false, message });
}

export function notFound(res: Response, message = 'Not found') {
  res.status(404).json({ success: false, message });
}

export function conflict(res: Response, message = 'Conflict') {
  res.status(409).json({ success: false, message });
}

export function serverError(res: Response, message = 'Internal server error') {
  res.status(500).json({ success: false, message });
}
