import { TopicPromptType } from '../commons/types';

export const textOnlyTopicPrompts: TopicPromptType[] = [
  {
    topic: 'Backend Engineering',
    userProfession: 'Backend Engineer',
    prompt:
      "Create a concise tweet about Backend Engineering (strictly under 250 characters). Share an insight, tip, fact, or opinion. Do not use quotes, emojis, or hashtags. Focus on clear, direct communication.",
  },
  {
    topic: 'Database Administration',
    userProfession: 'Database Administrator',
    prompt:
      "Create a concise tweet about Database Administration (strictly under 250 characters). Share an insight, tip, fact, or opinion. Do not use quotes, emojis, or hashtags. Focus on clear, direct communication.",
  },
  {
    topic: 'SQL',
    userProfession: 'Database Administrator',
    prompt:
      "Create a concise tweet about SQL (strictly under 250 characters). Share an insight, tip, fact, or opinion. Do not use quotes, emojis, or hashtags. Focus on clear, direct communication.",
  },
  {
    topic: 'API Security',
    userProfession: 'NodeJs Backend Engineer',
    prompt: 
      "Create a concise tweet about API Security (strictly under 250 characters). Share an insight, tip, fact, or opinion. Do not use quotes, emojis, or hashtags. Focus on clear, direct communication.",
  },
];

export const textAndSnippetTopicPrompts: TopicPromptType[] = [
  {
    topic: 'Data Structures',
    userProfession: 'Backend Engineer',
    prompt:
      "Create a tweet about Data Structures with a code example. The tweet text must be under 250 characters (excluding code). Provide a single, complete TypeScript code snippet in a markdown block. No hashtags or emojis.",
  },
  {
    topic: 'Algorithms',
    userProfession: 'Backend Engineer',
    prompt:
      "Create a tweet about Algorithms with a code example. The tweet text must be under 250 characters (excluding code). Provide a single, complete TypeScript code snippet in a markdown block. No hashtags or emojis.",
  },
  {
    topic: 'API Security',
    userProfession: 'NodeJs Backend Engineer',
    prompt: 
      "Create a tweet about API Security with a code example. The tweet text must be under 250 characters (excluding code). Provide a single, complete TypeScript code snippet in a markdown block. No hashtags or emojis.",
  },
];
