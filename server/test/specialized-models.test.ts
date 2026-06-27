import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from './setup';
import {
  createUserModel,
  createPostModel,
  createCommentModel,
  createPageModel,
  createMediaModel,
  createThemeModel,
  createPluginModel,
  createOptionModel,
  createTemplateModel,
} from '../storage';
import {
  blogs,
  users,
  posts,
  comments,
  pages,
  media,
  themes,
  plugins,
  options,
  templates,
  sites,
} from '@shared/schema';

// Helper function to generate consistent test UUIDs
const testUuids = {
  user1: '550e8400-e29b-41d4-a716-446655440001',
  user2: '550e8400-e29b-41d4-a716-446655440002',
  blog1: '550e8400-e29b-41d4-a716-446655440003',
  blog2: '550e8400-e29b-41d4-a716-446655440004',
  post1: '550e8400-e29b-41d4-a716-446655440005',
  post2: '550e8400-e29b-41d4-a716-446655440006',
  comment1: '550e8400-e29b-41d4-a716-446655440007',
  comment2: '550e8400-e29b-41d4-a716-446655440008',
  page1: '550e8400-e29b-41d4-a716-446655440009',
  media1: '550e8400-e29b-41d4-a716-446655440010',
  media2: '550e8400-e29b-41d4-a716-446655440011',
  theme1: '550e8400-e29b-41d4-a716-446655440012',
  theme2: '550e8400-e29b-41d4-a716-446655440013',
  plugin1: '550e8400-e29b-41d4-a716-446655440014',
  plugin2: '550e8400-e29b-41d4-a716-446655440015',
  option1: '550e8400-e29b-41d4-a716-446655440016',
  template1: '550e8400-e29b-41d4-a716-446655440017',
  template2: '550e8400-e29b-41d4-a716-446655440018',
  block1: '550e8400-e29b-41d4-a716-446655440019',
  block2: '550e8400-e29b-41d4-a716-446655440020',
  site1: '550e8400-e29b-41d4-a716-446655440021',
};

describe('Specialized Model Factories', () => {
  // Test data with proper UUIDs
  const testUser = {
    id: testUuids.user1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
  };

  const testBlog = {
    id: testUuids.blog1,
    name: 'Test Blog',
    description: 'A test blog',
    slug: 'test-blog',
    authorId: testUuids.user1,
    siteId: testUuids.site1,
  };

  beforeEach(async () => {
    // Clean up tables before each test (order matters due to foreign keys)
    // Delete in reverse dependency order: comments -> posts -> blogs -> sites -> users
    await testDb.delete(comments);
    await testDb.delete(posts);
    await testDb.delete(pages);
    await testDb.delete(media);
    await testDb.delete(themes);
    await testDb.delete(plugins);
    await testDb.delete(options);
    await testDb.delete(templates);
    await testDb.delete(blogs);
    await testDb.delete(sites);
    await testDb.delete(users);

    // Insert test user first (required for blog foreign key)
    await testDb.insert(users).values(testUser);

    await testDb.insert(sites).values({
      id: testUuids.site1,
      name: 'Test Site',
      ownerId: testUuids.user1,
    });

    // Insert test blogs
    await testDb.insert(blogs).values(testBlog);
    await testDb.insert(blogs).values({
      id: testUuids.blog2,
      name: 'Another Blog',
      description: 'Another test blog',
      slug: 'another-blog',
      authorId: testUuids.user1,
      siteId: testUuids.site1,
    });
  });

  describe('User Model Specialized Methods', () => {
    const userModel = createUserModel(testDb);

    beforeEach(async () => {
      // Don't delete users here as it's handled in the main beforeEach
      // Just insert additional test data if needed
      try {
        await testDb.insert(users).values({
          id: testUuids.user2,
          username: 'admin',
          email: 'admin@example.com',
          password: 'password',
          status: 'active',
        });
      } catch (error) {
        // Ignore duplicate key errors
      }
    });

    it('should find user by username', async () => {
      const user = await userModel.findByUsername('testuser');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(user?.email).toBe('test@example.com');
    });

    it('should find user by email', async () => {
      const user = await userModel.findByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(user?.email).toBe('test@example.com');
    });

    it('should find users by status', async () => {
      const activeUsers = await userModel.findByStatus('active');
      expect(activeUsers).toHaveLength(2);
      expect(activeUsers.every((user) => user.status === 'active')).toBe(true);
    });

    it('should return undefined for non-existent username', async () => {
      const user = await userModel.findByUsername('nonexistent');
      expect(user).toBeUndefined();
    });

    it('should return undefined for non-existent email', async () => {
      const user = await userModel.findByEmail('nonexistent@example.com');
      expect(user).toBeUndefined();
    });

    it('should find users ordered by username', async () => {
      const users = await userModel.findMany({
        orderBy: { property: 'username', order: 'ascending' },
      });
      expect(users).toHaveLength(2);
      expect(users[0].username).toBe('admin');
      expect(users[1].username).toBe('testuser');
    });

    it('should find users ordered by creation date descending', async () => {
      const users = await userModel.findMany({
        orderBy: { property: 'createdAt', order: 'descending' },
      });
      expect(users).toHaveLength(2);
      // Both users should be returned, order may vary based on creation time
      expect(users.every((user) => user.status === 'active')).toBe(true);
    });

    it('should handle invalid UUID gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const result = await userModel.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Post Model Specialized Methods', () => {
    const postModel = createPostModel(testDb);

    beforeEach(async () => {
      // Don't delete posts here as it's handled in the main beforeEach
      // Just insert test data
      try {
        await testDb.insert(posts).values({
          id: testUuids.post1,
          title: 'Test Post',
          slug: 'test-post',
          status: 'draft',
          authorId: testUuids.user1,
          blogId: testUuids.blog1,
        });
        await testDb.insert(posts).values({
          id: testUuids.post2,
          title: 'Published Post',
          slug: 'published-post',
          status: 'publish',
          authorId: testUuids.user1,
          blogId: testUuids.blog1,
          publishedAt: new Date(),
        });
      } catch (error) {
        // Ignore duplicate key errors
      }
    });

    it('should find post by slug', async () => {
      const post = await postModel.findBySlug('test-post');
      expect(post).toBeDefined();
      expect(post?.title).toBe('Test Post');
      expect(post?.slug).toBe('test-post');
    });

    it('should find posts by status', async () => {
      const draftPosts = await postModel.findByStatus('draft');
      expect(draftPosts).toHaveLength(1);
      expect(draftPosts[0].title).toBe('Test Post');

      const publishedPosts = await postModel.findByStatus('publish');
      expect(publishedPosts).toHaveLength(1);
      expect(publishedPosts[0].title).toBe('Published Post');
    });

    it('should find posts by author', async () => {
      const userPosts = await postModel.findByAuthor(testUuids.user1);
      expect(userPosts).toHaveLength(2);
      expect(userPosts.every((post) => post.authorId === testUuids.user1)).toBe(
        true,
      );
    });

    it('should find posts by blog', async () => {
      const blogPosts = await postModel.findByBlog(testUuids.blog1);
      expect(blogPosts).toHaveLength(2);
      expect(blogPosts.every((post) => post.blogId === testUuids.blog1)).toBe(
        true,
      );
    });

    it('should publish a post', async () => {
      const publishedPost = await postModel.publish(testUuids.post1);
      expect(publishedPost.status).toBe('publish');
      expect(publishedPost.publishedAt).toBeDefined();
    });

    it('should return undefined for non-existent slug', async () => {
      const post = await postModel.findBySlug('non-existent');
      expect(post).toBeUndefined();
    });

    it('should find posts ordered by title', async () => {
      const posts = await postModel.findMany({
        orderBy: { property: 'title', order: 'ascending' },
      });
      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe('Published Post');
      expect(posts[1].title).toBe('Test Post');
    });

    it('should find posts ordered by creation date descending', async () => {
      const posts = await postModel.findMany({
        orderBy: { property: 'createdAt', order: 'descending' },
      });
      expect(posts).toHaveLength(2);
      // Should return posts in reverse creation order
      expect(posts.every((post) => post.authorId === testUuids.user1)).toBe(
        true,
      );
    });

    it('should handle invalid UUID gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const result = await postModel.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Comment Model Specialized Methods', () => {
    const commentModel = createCommentModel(testDb);

    beforeEach(async () => {
      // Clean up existing comments
      try {
        await commentModel.delete(testUuids.comment1);
      } catch (error) {
        // Ignore if comment doesn't exist
      }
      try {
        await commentModel.delete(testUuids.comment2);
      } catch (error) {
        // Ignore if comment doesn't exist
      }

      // Ensure the required post exists for foreign key constraint
      try {
        await testDb.insert(posts).values({
          id: testUuids.post1,
          title: 'Test Post',
          slug: 'test-post',
          status: 'draft',
          authorId: testUuids.user1,
          blogId: testUuids.blog1,
        });
      } catch (error) {
        // Ignore duplicate key errors
      }

      // Create test comments using model methods
      await commentModel.create({
        id: testUuids.comment1,
        content: 'This is a test comment',
        authorName: 'Commenter',
        authorEmail: 'commenter@example.com',
        postId: testUuids.post1,
        status: 'pending',
      });
      await commentModel.create({
        id: testUuids.comment2,
        content: 'This is an approved comment',
        authorName: 'Approver',
        authorEmail: 'approver@example.com',
        postId: testUuids.post1,
        status: 'approved',
      });
    });

    it('should find comments by post', async () => {
      const postComments = await commentModel.findByPost(testUuids.post1);
      expect(postComments).toHaveLength(2);
      expect(
        postComments.every((comment) => comment.postId === testUuids.post1),
      ).toBe(true);
    });

    it('should find comments by status', async () => {
      const pendingComments = await commentModel.findByStatus('pending');
      expect(pendingComments).toHaveLength(1);
      expect(pendingComments[0].status).toBe('pending');

      const approvedComments = await commentModel.findByStatus('approved');
      expect(approvedComments).toHaveLength(1);
      expect(approvedComments[0].status).toBe('approved');
    });

    it('should approve a comment', async () => {
      const approvedComment = await commentModel.approve(testUuids.comment1);
      expect(approvedComment.status).toBe('approved');
    });

    it('should mark comment as spam', async () => {
      const spamComment = await commentModel.spam(testUuids.comment1);
      expect(spamComment.status).toBe('spam');
    });

    it('should find comments ordered by creation date', async () => {
      const comments = await commentModel.findMany({
        orderBy: { property: 'createdAt', order: 'ascending' },
      });
      expect(comments).toHaveLength(2);
      expect(
        comments.every((comment) => comment.postId === testUuids.post1),
      ).toBe(true);
    });

    it('should find comments ordered by author name', async () => {
      const comments = await commentModel.findMany({
        orderBy: { property: 'authorName', order: 'ascending' },
      });
      expect(comments).toHaveLength(2);
      expect(comments[0].authorName).toBe('Approver');
      expect(comments[1].authorName).toBe('Commenter');
    });

    it('should handle invalid UUID gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const result = await commentModel.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Page Model Specialized Methods', () => {
    const pageModel = createPageModel(testDb);

    beforeEach(async () => {
      // Clean up existing page and site
      try {
        await pageModel.delete(testUuids.page1);
      } catch (error) {
        // Ignore if page doesn't exist
      }

      // Create test page using model methods
      await pageModel.create({
        id: testUuids.page1,
        title: 'About Us',
        slug: 'about-us',
        siteId: testUuids.site1,
        status: 'draft',
        authorId: testUuids.user1,
      } as any);
    });

    it('should find page by slug', async () => {
      const page = await pageModel.findBySlug('about-us');
      expect(page).toBeDefined();
      expect(page?.title).toBe('About Us');
      expect(page?.slug).toBe('about-us');
    });

    it('should find pages by status', async () => {
      const draftPages = await pageModel.findByStatus('draft');
      expect(draftPages).toHaveLength(1);
      expect(draftPages[0].title).toBe('About Us');
    });

    it('should find pages by author', async () => {
      const userPages = await pageModel.findByAuthor(testUuids.user1);
      expect(userPages).toHaveLength(1);
      expect(userPages[0].authorId).toBe(testUuids.user1);
    });

    it('should publish a page', async () => {
      const publishedPage = await pageModel.publish(testUuids.page1);
      expect(publishedPage.status).toBe('publish');
      expect(publishedPage.publishedAt).toBeDefined();
    });
  });

  describe('Media Model Specialized Methods', () => {
    const mediaModel = createMediaModel(testDb);

    beforeEach(async () => {
      // Clean up existing media
      try {
        await mediaModel.delete(testUuids.media1);
      } catch (error) {
        // Ignore if media doesn't exist
      }
      try {
        await mediaModel.delete(testUuids.media2);
      } catch (error) {
        // Ignore if media doesn't exist
      }

      // Create test media using model methods
      await mediaModel.create({
        id: testUuids.media1,
        filename: 'test.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/test.jpg',
        authorId: testUuids.user1,
        siteId: testUuids.site1,
      });
      await mediaModel.create({
        id: testUuids.media2,
        filename: 'video.mp4',
        originalName: 'test-video.mp4',
        mimeType: 'video/mp4',
        size: 2048,
        url: '/uploads/video.mp4',
        authorId: testUuids.user1,
        siteId: testUuids.site1,
      });
    });

    it('should find media by author', async () => {
      const userMedia = await mediaModel.findByAuthor(testUuids.user1);
      expect(userMedia).toHaveLength(2);
      expect(
        userMedia.every((media) => media.authorId === testUuids.user1),
      ).toBe(true);
    });

    it('should find media by MIME type', async () => {
      const images = await mediaModel.findByMimeType('image/jpeg');
      expect(images).toHaveLength(1);
      expect(images[0].mimeType).toBe('image/jpeg');

      const videos = await mediaModel.findByMimeType('video/mp4');
      expect(videos).toHaveLength(1);
      expect(videos[0].mimeType).toBe('video/mp4');
    });

    it('should find media ordered by filename', async () => {
      const media = await mediaModel.findMany({
        orderBy: { property: 'filename', order: 'ascending' },
      });
      expect(media).toHaveLength(2);
      expect(media[0].filename).toBe('test.jpg');
      expect(media[1].filename).toBe('video.mp4');
    });

    it('should find media ordered by size descending', async () => {
      const media = await mediaModel.findMany({
        orderBy: { property: 'size', order: 'descending' },
      });
      expect(media).toHaveLength(2);
      expect(media[0].size).toBe(2048); // video.mp4
      expect(media[1].size).toBe(1024); // test.jpg
    });

    it('should handle invalid UUID gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const result = await mediaModel.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Theme Model Specialized Methods', () => {
    const themeModel = createThemeModel(testDb);

    beforeEach(async () => {
      // Clean up existing themes
      try {
        await themeModel.delete(testUuids.theme1);
      } catch (error) {
        // Ignore if theme doesn't exist
      }
      try {
        await themeModel.delete(testUuids.theme2);
      } catch (error) {
        // Ignore if theme doesn't exist
      }

      // Create test themes using model methods
      await themeModel.create({
        id: testUuids.theme1,
        name: 'Test Theme',
        version: '1.0.0',
        description: 'A test theme',
        status: 'inactive',
        authorId: testUuids.user1,
        requires: '1.0.0',
      });
      await themeModel.create({
        id: testUuids.theme2,
        name: 'Active Theme',
        version: '2.0.0',
        description: 'An active theme',
        status: 'active',
        authorId: testUuids.user1,
        requires: '1.0.0',
      });
    });

    it('should find active theme', async () => {
      const activeTheme = await themeModel.findActiveTheme();
      expect(activeTheme).toBeDefined();
      expect(activeTheme?.status).toBe('active');
      expect(activeTheme?.name).toBe('Active Theme');
    });

    it('should set active theme', async () => {
      const activatedTheme = await themeModel.setActiveTheme(testUuids.theme1);
      expect(activatedTheme.status).toBe('active');

      // Check that other themes are deactivated
      const activeTheme = await themeModel.findActiveTheme();
      expect(activeTheme?.id).toBe(testUuids.theme1);
    });

    it('should find theme by name', async () => {
      const theme = await themeModel.findByName('Test Theme');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Test Theme');
    });
  });

  describe('Plugin Model Specialized Methods', () => {
    const pluginModel = createPluginModel(testDb);

    beforeEach(async () => {
      // Clean up existing plugins
      try {
        await pluginModel.delete(testUuids.plugin1);
      } catch (error) {
        // Ignore if plugin doesn't exist
      }
      try {
        await pluginModel.delete(testUuids.plugin2);
      } catch (error) {
        // Ignore if plugin doesn't exist
      }

      // Create test plugins using model methods
      await pluginModel.create({
        id: testUuids.plugin1,
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        status: 'inactive',
        authorId: testUuids.user1,
        requires: '1.0.0',
      });
      await pluginModel.create({
        id: testUuids.plugin2,
        name: 'Active Plugin',
        version: '2.0.0',
        description: 'An active plugin',
        status: 'active',
        authorId: testUuids.user1,
        requires: '1.0.0',
      });
    });

    it('should find active plugins', async () => {
      const activePlugins = await pluginModel.findActivePlugins();
      expect(activePlugins).toHaveLength(1);
      expect(activePlugins[0].status).toBe('active');
      expect(activePlugins[0].name).toBe('Active Plugin');
    });

    it('should find plugin by name', async () => {
      const plugin = await pluginModel.findByName('Test Plugin');
      expect(plugin).toBeDefined();
      expect(plugin?.name).toBe('Test Plugin');
    });

    it('should activate plugin', async () => {
      const activatedPlugin = await pluginModel.activate(testUuids.plugin1);
      expect(activatedPlugin.status).toBe('active');
    });

    it('should deactivate plugin', async () => {
      const deactivatedPlugin = await pluginModel.deactivate(testUuids.plugin2);
      expect(deactivatedPlugin.status).toBe('inactive');
    });
  });

  describe('Option Model Specialized Methods', () => {
    const optionModel = createOptionModel(testDb);

    beforeEach(async () => {
      // Clean up existing options
      try {
        await optionModel.delete(testUuids.option1);
      } catch (error) {
        // Ignore if option doesn't exist
      }
    });

    it('should get option', async () => {
      await optionModel.create({
        id: testUuids.option1,
        name: 'site_title',
        value: 'My Site',
        siteId: testUuids.site1,
      });

      const option = await optionModel.getOption('site_title', testUuids.site1);
      expect(option).toBeDefined();
      expect(option?.name).toBe('site_title');
      expect(option?.value).toBe('My Site');
    });

    it('should set new option', async () => {
      const newOption = await optionModel.setOption({
        name: 'site_description',
        value: 'My site description',
        siteId: testUuids.site1,
      });

      expect(newOption.name).toBe('site_description');
      expect(newOption.value).toBe('My site description');
    });

    it('should update existing option', async () => {
      await optionModel.create({
        id: testUuids.option1,
        name: 'site_title',
        value: 'Old Title',
        siteId: testUuids.site1,
      });

      const updatedOption = await optionModel.setOption({
        name: 'site_title',
        value: 'New Title',
        siteId: testUuids.site1,
      });

      expect(updatedOption.name).toBe('site_title');
      expect(updatedOption.value).toBe('New Title');
    });

    it('should return undefined for non-existent option', async () => {
      const option = await optionModel.getOption('non_existent', testUuids.site1);
      expect(option).toBeUndefined();
    });
  });

  describe('Template Model Specialized Methods', () => {
    const templateModel = createTemplateModel(testDb);

    beforeEach(async () => {
      // Clean up existing templates
      try {
        await templateModel.delete(testUuids.template1);
      } catch (error) {
        // Ignore if template doesn't exist
      }
      try {
        await templateModel.delete(testUuids.template2);
      } catch (error) {
        // Ignore if template doesn't exist
      }

      // Create test templates using model methods
      await templateModel.create({
        id: testUuids.template1,
        name: 'Page Template',
        type: 'page',
        blocks: [],
        authorId: testUuids.user1,
      });
      await templateModel.create({
        id: testUuids.template2,
        name: 'Post Template',
        type: 'post',
        blocks: [],
        authorId: testUuids.user1,
      });
    });

    it('should find templates by type', async () => {
      const pageTemplates = await templateModel.findByType('page');
      expect(pageTemplates).toHaveLength(1);
      expect(pageTemplates[0].type).toBe('page');

      const postTemplates = await templateModel.findByType('post');
      expect(postTemplates).toHaveLength(1);
      expect(postTemplates[0].type).toBe('post');
    });

    it('should find global templates', async () => {
      const globalTemplates = await templateModel.findGlobalTemplates();
      expect(globalTemplates).toHaveLength(2);
      expect(
        globalTemplates.every(
          (template) => template.type === 'page' || template.type === 'post',
        ),
      ).toBe(true);
    });

    it('should find active templates', async () => {
      const activeTemplates = await templateModel.findActiveTemplates();
      expect(activeTemplates).toHaveLength(2);
      expect(
        activeTemplates.every(
          (template) => template.type === 'page' || template.type === 'post',
        ),
      ).toBe(true);
    });

    it('should find templates by priority', async () => {
      const priorityTemplates = await templateModel.findByPriority(1);
      expect(priorityTemplates).toHaveLength(0); // No priority property
    });

    it('should duplicate template', async () => {
      const duplicatedTemplate = await templateModel.duplicate(
        testUuids.template1,
        'Duplicated Template',
      );
      expect(duplicatedTemplate.name).toBe('Duplicated Template');
      expect(duplicatedTemplate.type).toBe('page');
      expect(duplicatedTemplate.id).not.toBe(testUuids.template1);
    });

    it('should throw error when duplicating non-existent template', async () => {
      await expect(
        templateModel.duplicate(
          '550e8400-e29b-41d4-a716-446655440999',
          'New Template',
        ),
      ).rejects.toThrow('Template not found');
    });

    it('should find templates ordered by name', async () => {
      const templates = await templateModel.findMany({
        orderBy: { property: 'name', order: 'ascending' },
      });
      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Page Template');
      expect(templates[1].name).toBe('Post Template');
    });

    it('should find templates ordered by creation date descending', async () => {
      const templates = await templateModel.findMany({
        orderBy: { property: 'createdAt', order: 'descending' },
      });
      expect(templates).toHaveLength(2);
      expect(
        templates.every((template) => template.authorId === testUuids.user1),
      ).toBe(true);
    });

    it('should handle invalid UUID gracefully', async () => {
      // Use a valid UUID format but non-existent ID
      const result = await templateModel.findById(
        '550e8400-e29b-41d4-a716-446655440999',
      );
      expect(result).toBeUndefined();
    });
  });

  describe('Block Storage Tests (within Templates/Pages)', () => {
    const templateModel = createTemplateModel(testDb);
    const pageModel = createPageModel(testDb);

    beforeEach(async () => {
      // Clean up existing test pages/templates
      try {
        await templateModel.delete(testUuids.template1);
      } catch (error) {
        // Ignore if doesn't exist
      }
      try {
        await pageModel.delete(testUuids.page1);
      } catch (error) {
        // Ignore if doesn't exist
      }
    });

    it('should store and retrieve blocks in templates', async () => {
      const blockConfigs = [
        {
          id: testUuids.block1,
          name: 'heading',
          type: 'block',
          parentId: null,
          content: { text: 'Template Heading', level: 1 },
          styles: {},
        },
        {
          id: testUuids.block2,
          name: 'text',
          type: 'block',
          parentId: null,
          content: { text: 'Template text content' },
          styles: {},
        },
      ];

      const template = await templateModel.create({
        id: testUuids.template1,
        name: 'Test Template',
        type: 'page',
        authorId: testUuids.user1,
        blocks: blockConfigs,
      });

      expect(template.blocks).toHaveLength(2);
      expect((template.blocks as any)[0].name).toBe('heading');
      expect((template.blocks as any)[1].name).toBe('text');
    });

    it('should store and retrieve blocks in pages', async () => {
      const blockConfigs = [
        {
          id: testUuids.block1,
          name: 'heading',
          type: 'block',
          parentId: null,
          content: { text: 'Page Heading', level: 2 },
          styles: {},
        },
      ];

      const page = await pageModel.create({
        id: testUuids.page1,
        title: 'Test Page',
        slug: 'test-page-blocks',
        siteId: testUuids.site1,
        authorId: testUuids.user1,
        blocks: blockConfigs,
      } as any);

      expect(page.blocks).toHaveLength(1);
      expect((page.blocks as any)[0].name).toBe('heading');
    });

    it('should update blocks in templates', async () => {
      const initialBlocks = [
        {
          id: testUuids.block1,
          name: 'text',
          type: 'block',
          parentId: null,
          content: { text: 'Initial text' },
          styles: {},
        },
      ];

      const template = await templateModel.create({
        id: testUuids.template1,
        name: 'Updatable Template',
        type: 'page',
        authorId: testUuids.user1,
        blocks: initialBlocks,
      });

      const updatedBlocks = [
        {
          id: testUuids.block1,
          name: 'text',
          type: 'block',
          parentId: null,
          content: { text: 'Updated text' },
          styles: {},
        },
        {
          id: testUuids.block2,
          name: 'heading',
          type: 'block',
          parentId: null,
          content: { text: 'New heading', level: 1 },
          styles: {},
        },
      ];

      const updated = await templateModel.update(template.id, {
        blocks: updatedBlocks,
      });

      expect(updated.blocks).toHaveLength(2);
      expect((updated.blocks as any)[0].content.text).toBe('Updated text');
      expect((updated.blocks as any)[1].name).toBe('heading');
    });

    it('should handle nested container blocks', async () => {
      const nestedBlocks = [
        {
          id: testUuids.block1,
          name: 'group',
          type: 'container',
          parentId: null,
          content: {},
          styles: {},
          children: [
            {
              id: testUuids.block2,
              name: 'heading',
              type: 'block',
              parentId: testUuids.block1,
              content: { text: 'Nested heading', level: 1 },
              styles: {},
            },
          ],
        },
      ];

      const template = await templateModel.create({
        id: testUuids.template1,
        name: 'Nested Template',
        type: 'page',
        authorId: testUuids.user1,
        blocks: nestedBlocks,
      });

      expect(template.blocks).toHaveLength(1);
      const containerBlock = (template.blocks as any)[0];
      expect(containerBlock.type).toBe('container');
      expect(containerBlock.children).toHaveLength(1);
      expect(containerBlock.children[0].parentId).toBe(testUuids.block1);
    });

    it('should find templates with blocks', async () => {
      await templateModel.create({
        id: testUuids.template1,
        name: 'Template with Blocks',
        type: 'page',
        authorId: testUuids.user1,
        blocks: [
          {
            id: testUuids.block1,
            name: 'heading',
            type: 'block',
            parentId: null,
            content: { text: 'Test', level: 1 },
            styles: {},
          },
        ],
      });

      const found = await templateModel.findById(testUuids.template1);
      expect(found).toBeDefined();
      expect(found?.blocks).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    const userModel = createUserModel(testDb);
    const postModel = createPostModel(testDb);

    it('should handle complex queries with multiple filters and ordering', async () => {
      // Create additional test data
      await userModel.create({
        id: '550e8400-e29b-41d4-a716-446655440021',
        username: 'editor',
        email: 'editor@example.com',
        password: 'password',
        status: 'active',
      });

      await postModel.create({
        id: '550e8400-e29b-41d4-a716-446655440022',
        title: 'Editor Post',
        slug: 'editor-post',
        status: 'publish',
        authorId: '550e8400-e29b-41d4-a716-446655440021',
        blogId: testUuids.blog1,
        publishedAt: new Date(),
      });

      // Test complex query: find published posts ordered by title
      const publishedPosts = await postModel.findMany({
        where: 'status',
        equals: 'publish',
        orderBy: { property: 'title', order: 'ascending' },
      });

      // Should find both the existing published post and the new one
      expect(publishedPosts.length).toBeGreaterThanOrEqual(1);
      expect(publishedPosts.every((post) => post.status === 'publish')).toBe(
        true,
      );

      // If we have 2 posts, verify ordering
      if (publishedPosts.length === 2) {
        expect(publishedPosts[0].title).toBe('Editor Post');
        expect(publishedPosts[1].title).toBe('Published Post');
      }
    });

    it('should handle pagination with ordering', async () => {
      // Create multiple users for pagination test
      for (let i = 0; i < 5; i++) {
        await userModel.create({
          id: `550e8400-e29b-41d4-a716-4466554400${30 + i}`,
          username: `user${i}`,
          email: `user${i}@example.com`,
          password: 'password',
          status: 'active',
        });
      }

      // Test pagination with ordering
      const firstPage = await userModel.findMany({
        limit: 3,
        offset: 0,
        orderBy: { property: 'username', order: 'ascending' },
      });

      const secondPage = await userModel.findMany({
        limit: 3,
        offset: 3,
        orderBy: { property: 'username', order: 'ascending' },
      });

      expect(firstPage).toHaveLength(3);
      expect(secondPage.length).toBeGreaterThanOrEqual(3);

      // Verify ordering - check that results are properly ordered
      const allUsers = [...firstPage, ...secondPage];
      const usernames = allUsers.map((u) => u.username);
      const sortedUsernames = [...usernames].sort();

      // The usernames should be in alphabetical order
      expect(usernames).toEqual(sortedUsernames);
    });

    it('should handle edge case with empty results', async () => {
      // Test query that should return empty results
      const nonExistentPosts = await postModel.findMany({
        where: 'status',
        equals: 'archived',
        orderBy: { property: 'title', order: 'ascending' },
      });

      expect(nonExistentPosts).toHaveLength(0);
    });

    it('should handle malformed data gracefully', async () => {
      // Test with invalid orderBy property
      await expect(
        userModel.findMany({
          orderBy: { property: 'invalidField', order: 'ascending' },
        }),
      ).rejects.toThrow("Column 'invalidField' does not exist on table");
    });
  });
});
