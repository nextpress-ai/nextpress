import { describe, expect, it, vi } from 'vitest';
import { saveEditorBlocks } from '@/lib/save-editor-blocks';

vi.mock('@/lib/queryClient', () => ({
  apiRequest: vi.fn(),
}));

describe('saveEditorBlocks', () => {
  it('builds page save payload with expected version', async () => {
    const { apiRequest } = await import('@/lib/queryClient');
    vi.mocked(apiRequest).mockResolvedValue({
      json: async () => ({ id: 'page-1', title: 'Home', version: 2 }),
    } as Response);

    const result = await saveEditorBlocks({
      contentType: 'page',
      id: 'page-1',
      expectedVersion: 1,
      title: 'Home',
      slug: 'home',
      status: 'draft',
      blocks: [],
    });

    expect(apiRequest).toHaveBeenCalledWith('PUT', '/api/pages/page-1', {
      title: 'Home',
      slug: 'home',
      status: 'draft',
      blocks: [],
      expectedVersion: 1,
    });
    expect(result).toEqual({ id: 'page-1', title: 'Home', version: 2 });
  });
});
