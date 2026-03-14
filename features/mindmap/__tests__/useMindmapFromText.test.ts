import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMindmapFromText } from '../hooks/useMindmapFromText';

vi.mock('../../../services/geminiService', () => ({
  generateStructured: vi.fn(),
}));

describe('useMindmapFromText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with null tree, not loading, no error', () => {
    const { result } = renderHook(() => useMindmapFromText());
    expect(result.current.tree).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets loading=true during generation and returns tree on success', async () => {
    const { generateStructured } = await import('../../../services/geminiService');
    (generateStructured as any).mockResolvedValue({
      root: {
        id: 'root-1',
        label: 'Chủ đề chính',
        children: [
          { id: 'b1', label: 'Nhánh 1', children: [] },
          { id: 'b2', label: 'Nhánh 2', children: [{ id: 'b2s1', label: 'Chi tiết' }] },
        ],
      },
    });

    const { result } = renderHook(() => useMindmapFromText());

    let generatePromise: Promise<void>;
    act(() => {
      generatePromise = result.current.generate('văn bản test');
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      await generatePromise;
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tree).not.toBeNull();
    expect(result.current.tree?.label).toBe('Chủ đề chính');
    expect(result.current.tree?.children).toHaveLength(2);
    expect(result.current.tree?.children[1].children[0].label).toBe('Chi tiết');
  });

  it('sets error on API failure', async () => {
    const { generateStructured } = await import('../../../services/geminiService');
    (generateStructured as any).mockRejectedValue(new Error('API lỗi test'));

    const { result } = renderHook(() => useMindmapFromText());

    await act(async () => {
      await result.current.generate('some text');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('API lỗi test');
    expect(result.current.tree).toBeNull();
  });

  it('sets error for empty input without calling API', async () => {
    const { generateStructured } = await import('../../../services/geminiService');

    const { result } = renderHook(() => useMindmapFromText());

    await act(async () => {
      await result.current.generate('   ');
    });

    expect(generateStructured).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/nhập/);
  });

  it('reset clears all state', async () => {
    const { generateStructured } = await import('../../../services/geminiService');
    (generateStructured as any).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useMindmapFromText());

    await act(async () => {
      await result.current.generate('text');
    });

    expect(result.current.error).toBeTruthy();

    act(() => result.current.reset());

    expect(result.current.tree).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});
