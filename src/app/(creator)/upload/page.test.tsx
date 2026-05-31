import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadPage from './page';

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'creator-uuid-1', name: 'Test Creator' },
      accessToken: 'test-token-123'
    },
    status: 'authenticated'
  })
}));

// Mock Language Context
jest.mock('../../../context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'upload.title': 'Upload Song & Stems',
        'upload.drag_drop_full': 'Upload Full Track (.wav, .mp3, max 50MB)',
        'upload.song_title': 'Song Title',
        'upload.genre': 'Genre',
        'upload.allow_remix': 'Allow AI Remixing',
        'upload.publish_btn': 'Publish Song',
        'common.success': 'Success',
        'common.error': 'Error'
      };
      return keys[key] || key;
    }
  })
}));

describe('UploadPage Component', () => {
  it('renders the upload headers and metadata form', () => {
    render(<UploadPage />);
    
    // Kiểm tra tiêu đề trang
    expect(screen.getByText('Upload Song & Stems')).toBeInTheDocument();
    
    // Kiểm tra các trường dữ liệu
    expect(screen.getByPlaceholderText('Enter track name...')).toBeInTheDocument();
    expect(screen.getByText('Genre')).toBeInTheDocument();
    expect(screen.getByText('License Rights')).toBeInTheDocument();
    
    // Kiểm tra nút bấm Upload và mặc định bị Disable khi chưa có file
    const uploadBtn = screen.getByRole('button', { name: /Publish Song/i });
    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).toBeDisabled();
  });

  it('allows user to enter track title', () => {
    render(<UploadPage />);
    
    // Lấy ô nhập liệu và gõ text
    const titleInput = screen.getByPlaceholderText('Enter track name...');
    fireEvent.change(titleInput, { target: { value: 'My Awesome Remix' } });
    
    expect(titleInput).toHaveValue('My Awesome Remix');
  });
});
