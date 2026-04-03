#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';

// ── Config ─────────────────────────────────────────────────────────────────
const API_URL   = process.env.ASTROCHAT_API_URL   || 'https://astrochat-api.onrender.com';
const API_TOKEN = process.env.ASTROCHAT_API_TOKEN || '';

// ── Axios client ───────────────────────────────────────────────────────────
const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {},
  timeout: 30000,
});

// ── Helper ─────────────────────────────────────────────────────────────────
const ok  = (data: unknown)  => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });
const err = (msg: string)    => ({ content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true });

// ── Tool schemas ───────────────────────────────────────────────────────────
const GetSessionsInput = z.object({
  status: z.enum(['pending', 'active', 'ended', 'all']).optional().default('all'),
  limit:  z.number().optional().default(20),
});

const GetMessagesInput = z.object({
  sessionId: z.string().describe('The session _id to fetch messages for'),
});

const CreateUserInput = z.object({
  fullName:    z.string(),
  email:       z.string().email(),
  password:    z.string().min(6),
  role:        z.enum(['user', 'astrologer']).optional().default('user'),
  gender:      z.enum(['Male', 'Female', 'Other']).optional(),
  dateOfBirth: z.string().optional(),
  timeOfBirth: z.string().optional(),
  placeOfBirth:z.string().optional(),
  phone:       z.string().optional(),
});

const LoginInput = z.object({
  email:    z.string().email(),
  password: z.string(),
});

const UpdateSessionInput = z.object({
  sessionId: z.string().describe('The session _id to update'),
  status:    z.enum(['active', 'ended']).describe('New status to set'),
});

const SendMessageInput = z.object({
  sessionId: z.string(),
  content:   z.string(),
  type:      z.enum(['text', 'image', 'file']).optional().default('text'),
});

const CreateSessionInput = z.object({
  astrologerId: z.string().describe('The astrologer _id'),
  type:         z.enum(['chat', 'voice', 'video']).optional().default('chat'),
});

// ── MCP Server ─────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'astrochat-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

// ── List tools ─────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_stats',
      description: 'Get AstroChat dashboard statistics — total users, sessions, messages and a breakdown by status.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_users',
      description: 'List all registered users in AstroChat with their profiles.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_astrologer',
      description: 'Get the astrologer profile currently registered in AstroChat.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name: 'get_sessions',
      description: 'List all sessions. Optionally filter by status (pending / active / ended / all).',
      inputSchema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'active', 'ended', 'all'],
            description: 'Filter sessions by status. Defaults to all.',
          },
          limit: {
            type: 'number',
            description: 'Max number of sessions to return. Defaults to 20.',
          },
        },
      },
    },
    {
      name: 'get_messages',
      description: 'Get the full chat message history for a specific session.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'The MongoDB _id of the session',
          },
        },
        required: ['sessionId'],
      },
    },
    {
      name: 'create_user',
      description: 'Register a new user (or astrologer) in AstroChat.',
      inputSchema: {
        type: 'object',
        properties: {
          fullName:    { type: 'string' },
          email:       { type: 'string' },
          password:    { type: 'string', description: 'Min 6 characters' },
          role:        { type: 'string', enum: ['user', 'astrologer'] },
          gender:      { type: 'string', enum: ['Male', 'Female', 'Other'] },
          dateOfBirth: { type: 'string', description: 'e.g. 1990-05-30' },
          timeOfBirth: { type: 'string', description: 'e.g. 06:30' },
          placeOfBirth:{ type: 'string', description: 'e.g. Chennai, India' },
          phone:       { type: 'string' },
        },
        required: ['fullName', 'email', 'password'],
      },
    },
    {
      name: 'login',
      description: 'Login as a user or astrologer and get a JWT token for subsequent requests.',
      inputSchema: {
        type: 'object',
        properties: {
          email:    { type: 'string' },
          password: { type: 'string' },
        },
        required: ['email', 'password'],
      },
    },
    {
      name: 'create_session',
      description: 'Create a new chat/voice/video session request from a user to the astrologer.',
      inputSchema: {
        type: 'object',
        properties: {
          astrologerId: { type: 'string', description: 'The _id of the astrologer' },
          type: {
            type: 'string',
            enum: ['chat', 'voice', 'video'],
            description: 'Type of session',
          },
        },
        required: ['astrologerId'],
      },
    },
    {
      name: 'update_session_status',
      description: 'Update a session status — set to active (accept) or ended (close).',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', description: 'The MongoDB _id of the session' },
          status:    { type: 'string', enum: ['active', 'ended'] },
        },
        required: ['sessionId', 'status'],
      },
    },
    {
      name: 'send_message',
      description: 'Send a text message into a chat session.',
      inputSchema: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          content:   { type: 'string', description: 'Message text to send' },
          type:      { type: 'string', enum: ['text', 'image', 'file'] },
        },
        required: ['sessionId', 'content'],
      },
    },
    {
      name: 'health_check',
      description: 'Check if the AstroChat backend API is running and reachable.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
  ],
}));

// ── Call tool ──────────────────────────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      // ── Health check ─────────────────────────────────────────────────
      case 'health_check': {
        const res = await client.get('/');
        return ok({ status: 'online', response: res.data, api_url: API_URL });
      }

      // ── Stats ────────────────────────────────────────────────────────
      case 'get_stats': {
        const [usersRes, sessionsRes, messagesRes] = await Promise.all([
          client.get('/api/admin/users').catch(() => null),
          client.get('/api/admin/sessions').catch(() => null),
          client.get('/api/admin/messages').catch(() => null),
        ]);

        const users    = usersRes?.data    || [];
        const sessions = sessionsRes?.data || [];
        const messages = messagesRes?.data || [];

        return ok({
          summary: {
            total_users:    users.length,
            total_sessions: sessions.length,
            total_messages: messages.length,
          },
          users_by_role: {
            astrologers: users.filter((u: any) => u.role === 'astrologer').length,
            users:       users.filter((u: any) => u.role === 'user').length,
          },
          sessions_by_status: {
            pending: sessions.filter((s: any) => s.status === 'pending').length,
            active:  sessions.filter((s: any) => s.status === 'active').length,
            ended:   sessions.filter((s: any) => s.status === 'ended').length,
          },
          sessions_by_type: {
            chat:  sessions.filter((s: any) => s.type === 'chat').length,
            voice: sessions.filter((s: any) => s.type === 'voice').length,
            video: sessions.filter((s: any) => s.type === 'video').length,
          },
        });
      }

      // ── Get users ────────────────────────────────────────────────────
      case 'get_users': {
        const res = await client.get('/api/admin/users');
        return ok({ count: res.data.length, users: res.data });
      }

      // ── Get astrologer ───────────────────────────────────────────────
      case 'get_astrologer': {
        const res = await client.get('/api/astrologer');
        return ok(res.data);
      }

      // ── Get sessions ─────────────────────────────────────────────────
      case 'get_sessions': {
        const input = GetSessionsInput.parse(args || {});
        const res   = await client.get('/api/admin/sessions');
        let sessions = res.data;
        if (input.status !== 'all') {
          sessions = sessions.filter((s: any) => s.status === input.status);
        }
        sessions = sessions.slice(0, input.limit);
        return ok({ count: sessions.length, sessions });
      }

      // ── Get messages ─────────────────────────────────────────────────
      case 'get_messages': {
        const input = GetMessagesInput.parse(args);
        const res   = await client.get(`/api/sessions/${input.sessionId}/messages`);
        return ok({ count: res.data.length, messages: res.data });
      }

      // ── Create user ──────────────────────────────────────────────────
      case 'create_user': {
        const input = CreateUserInput.parse(args);
        const res   = await client.post('/api/auth/register', input);
        return ok({
          message: `User "${res.data.user.fullName}" created successfully`,
          user:    res.data.user,
          token:   res.data.token,
        });
      }

      // ── Login ────────────────────────────────────────────────────────
      case 'login': {
        const input = LoginInput.parse(args);
        const res   = await client.post('/api/auth/login', input);
        return ok({
          message: `Logged in as ${res.data.user.fullName} (${res.data.user.role})`,
          token:   res.data.token,
          user:    res.data.user,
        });
      }

      // ── Create session ───────────────────────────────────────────────
      case 'create_session': {
        const input = CreateSessionInput.parse(args);
        const res   = await client.post('/api/sessions', input);
        return ok({
          message: `${input.type} session created`,
          session: res.data,
        });
      }

      // ── Update session status ────────────────────────────────────────
      case 'update_session_status': {
        const input = UpdateSessionInput.parse(args);
        const res   = await client.patch(`/api/sessions/${input.sessionId}`, {
          status: input.status,
        });
        return ok({
          message: `Session ${input.sessionId} updated to "${input.status}"`,
          session: res.data,
        });
      }

      // ── Send message ─────────────────────────────────────────────────
      case 'send_message': {
        const input = SendMessageInput.parse(args);
        const res   = await client.post('/api/messages', {
          sessionId: input.sessionId,
          content:   input.content,
          type:      input.type,
        });
        return ok({
          message: 'Message sent successfully',
          data:    res.data,
        });
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (e: any) {
    if (e instanceof McpError) throw e;
    if (e?.response?.data) return err(JSON.stringify(e.response.data));
    return err(e?.message || 'Unknown error');
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AstroChat MCP server running — connected via stdio');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
