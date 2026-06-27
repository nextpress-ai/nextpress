import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from './setup';
import { createModel } from '../../shared/create-models';
import { sql } from 'drizzle-orm';
import {
  users,
  posts,
  comments,
  pages,
  media,
  themes,
  plugins,
  options,
  templates,
  blogs,
  sites,
} from '../../shared/schema';

describe('createModel - Generic CRUD Operations', () => {
  // Dynamic ID generation for tests
  const generateId = () => crypto.randomUUID();

  // Test data with dynamic IDs
  let testUser: any;
  let testPost: any;
  let testComment: any;
  let testBlog: any;
  let testSite: any;

  beforeEach(async () => {
    // Generate dynamic test data
    testUser = {
      id: generateId(),
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testSite = {
      id: generateId(),
      name: 'Test Site',
      ownerId: testUser.id,
    };

    testBlog = {
      id: generateId(),
      name: 'Test Blog',
      description: 'A test blog',
      slug: 'test-blog',
      authorId: testUser.id,
      siteId: testSite.id,
    };

    testPost = {
      id: generateId(),
      title: 'Test Post',
      slug: 'test-post',
      content: 'This is a test post content',
      excerpt: 'Test excerpt',
      status: 'draft',
      authorId: testUser.id,
      blogId: testBlog.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    testComment = {
      id: generateId(),
      content: 'This is a test comment',
      authorName: 'Commenter',
      authorEmail: 'commenter@example.com',
      postId: testPost.id,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Clean up tables before each test (delete child records first)
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

    // Insert test data
    await testDb.insert(users).values(testUser);
    await testDb.insert(sites).values(testSite);
    await testDb.insert(blogs).values(testBlog);
    await testDb.insert(posts).values(testPost);
    await testDb.insert(comments).values(testComment);
  });

  describe('User Model Tests', () => {
    const userModel = createModel(users, testDb);

    it('should find user by ID', async () => {
      const user = await userModel.findById(testUser.id);
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
      expect(user?.email).toBe('test@example.com');
    });

    it('should return undefined for generateId() user', async () => {
      const user = await userModel.findById(generateId());
      expect(user).toBeUndefined();
    });

    it('should create a new user', async () => {
      const newUser = {
        id: generateId(),
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const created = await userModel.create(newUser);
      expect(created.username).toBe('newuser');
      expect(created.email).toBe('new@example.com');
      expect(created.id).toBe(newUser.id);
    });

    it('should update user', async () => {
      const updated = await userModel.update(testUser.id, {
        firstName: 'Updated',
      });
      expect(updated.firstName).toBe('Updated');
      expect(updated.username).toBe('testuser'); // Other fields should remain
    });

    it('should delete user', async () => {
      // Delete dependent records first to avoid foreign key constraints
      await testDb.delete(comments);
      await testDb.delete(posts);
      await testDb.delete(blogs);
      await testDb.delete(sites);

      await userModel.delete(testUser.id);
      const user = await userModel.findById(testUser.id);
      expect(user).toBeUndefined();
    });

    it('should find users with filters', async () => {
      // Create another user with different status
      await userModel.create({
        id: generateId(),
        username: 'inactiveuser',
        email: 'inactive@example.com',
        password: 'password',
        status: 'inactive',
      });

      const activeUsers = await userModel.findManyWhere([
        { where: 'status', equals: 'active' },
      ]);
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toBe('testuser');

      const inactiveUsers = await userModel.findManyWhere([
        { where: 'status', equals: 'inactive' },
      ]);
      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].username).toBe('inactiveuser');
    });

    it('should find first user with filters', async () => {
      const user = await userModel.findFirst([
        { where: 'username', equals: 'testuser' },
      ]);
      expect(user).toBeDefined();
      expect(user?.username).toBe('testuser');
    });

    it('should count users', async () => {
      const count = await userModel.count();
      expect(count).toBe(1);

      // Add another user
      await userModel.create({
        id: generateId(),
        username: 'user2',
        email: 'user2@example.com',
        password: 'password',
      });

      const newCount = await userModel.count();
      expect(newCount).toBe(2);
    });

    it('should upsert user', async () => {
      const userId = generateId();

      // First upsert should create
      const created = await userModel.upsert({
        id: userId,
        username: 'upsertuser',
        email: 'upsert@example.com',
        password: 'password',
      });
      expect(created.username).toBe('upsertuser');

      // Second upsert should update (same ID)
      const updated = await userModel.upsert({
        id: userId,
        username: 'upsertuser',
        email: 'upsert@example.com',
        password: 'password',
        firstName: 'Updated',
      });
      expect(updated.firstName).toBe('Updated');
    });

    it('should find many with pagination', async () => {
      // Create multiple users
      for (let i = 2; i <= 5; i++) {
        await userModel.create({
          id: generateId(),
          username: `user${i}`,
          email: `user${i}@example.com`,
          password: 'password',
        });
      }

      const firstPage = await userModel.findMany({ limit: 2, offset: 0 });
      expect(firstPage).toHaveLength(2);

      const secondPage = await userModel.findMany({ limit: 2, offset: 2 });
      expect(secondPage).toHaveLength(2);
    });

    it('should find many with ordering', async () => {
      // Create users with different usernames
      await userModel.create({
        id: generateId(),
        username: 'auser',
        email: 'a@example.com',
        password: 'password',
      });

      await userModel.create({
        id: generateId(),
        username: 'zuser',
        email: 'z@example.com',
        password: 'password',
      });

      const ascending = await userModel.findMany({
        orderBy: { property: 'username', order: 'ascending' },
      });
      expect(ascending[0].username).toBe('auser');
      expect(ascending[1].username).toBe('testuser');
      expect(ascending[2].username).toBe('zuser');

      const descending = await userModel.findMany({
        orderBy: { property: 'username', order: 'descending' },
      });
      expect(descending[0].username).toBe('zuser');
      expect(descending[1].username).toBe('testuser');
      expect(descending[2].username).toBe('auser');
    });

    it('should find many with shorthand filters', async () => {
      await userModel.create({
        id: generateId(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'password',
        status: 'active',
      });

      const activeUsers = await userModel.findMany({
        where: 'status',
        equals: 'active',
      });
      expect(activeUsers).toHaveLength(2);

      const specificUser = await userModel.findMany({
        where: 'username',
        equals: 'testuser',
      });
      expect(specificUser).toHaveLength(1);
      expect(specificUser[0].username).toBe('testuser');
    });

    it('should find many with complex filters', async () => {
      await userModel.create({
        id: generateId(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'password',
        status: 'active',
      });

      // Test multiple filters
      const results = await userModel.findManyWhere([
        { where: 'status', equals: 'active' },
        { where: 'username', like: '%user' },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('testuser');
    });

    it('should handle different operators', async () => {
      await userModel.create({
        id: generateId(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'password',
        status: 'active',
      });

      // Test not equals
      const notActive = await userModel.findManyWhere([
        { where: 'status', notEquals: 'active' },
      ]);
      expect(notActive).toHaveLength(0);

      // Test like
      const likeResults = await userModel.findManyWhere([
        { where: 'username', like: '%test%' },
      ]);
      expect(likeResults).toHaveLength(1);
      expect(likeResults[0].username).toBe('testuser');

      // Test in
      const inResults = await userModel.findManyWhere([
        { where: 'username', in: ['testuser', 'admin'] },
      ]);
      expect(inResults).toHaveLength(2);

      // Test not in
      const notInResults = await userModel.findManyWhere([
        { where: 'username', notIn: ['testuser'] },
      ]);
      expect(notInResults).toHaveLength(1);
      expect(notInResults[0].username).toBe('admin');
    });
  });

  describe('Post Model Tests', () => {
    const postModel = createModel(posts, testDb);

    it('should find post by ID', async () => {
      const post = await postModel.findById(testPost.id);
      expect(post).toBeDefined();
      expect(post?.title).toBe('Test Post');
      expect(post?.slug).toBe('test-post');
    });

    it('should create a new post', async () => {
      const newPost = {
        id: generateId(),
        title: 'Another Post',
        slug: 'another-post',
        content: 'Another post content',
        authorId: testUser.id,
        blogId: testBlog.id,
      };

      const created = await postModel.create(newPost);
      expect(created.title).toBe('Another Post');
      expect(created.slug).toBe('another-post');
    });

    it('should find posts by status', async () => {
      const draftPosts = await postModel.findManyWhere([
        { where: 'status', equals: 'draft' },
      ]);
      expect(draftPosts).toHaveLength(1);
      expect(draftPosts[0].title).toBe('Test Post');
    });

    it('should find posts by author', async () => {
      const userPosts = await postModel.findManyWhere([
        { where: 'authorId', equals: testUser.id },
      ]);
      expect(userPosts).toHaveLength(1);
      expect(userPosts[0].title).toBe('Test Post');
    });
  });

  describe('Comment Model Tests', () => {
    const commentModel = createModel(comments, testDb);

    it('should find comment by ID', async () => {
      const comment = await commentModel.findById(testComment.id);
      expect(comment).toBeDefined();
      expect(comment?.content).toBe('This is a test comment');
      expect(comment?.authorName).toBe('Commenter');
    });

    it('should find comments by post', async () => {
      const postComments = await commentModel.findManyWhere([
        { where: 'postId', equals: testPost.id },
      ]);
      expect(postComments).toHaveLength(1);
      expect(postComments[0].content).toBe('This is a test comment');
    });

    it('should find comments by status', async () => {
      const pendingComments = await commentModel.findManyWhere([
        { where: 'status', equals: 'pending' },
      ]);
      expect(pendingComments).toHaveLength(1);
      expect(pendingComments[0].status).toBe('pending');
    });
  });

  describe('Page Model Tests', () => {
    const pageModel = createModel(pages, testDb);

    it('should create and find pages', async () => {
      const newPage = {
        id: generateId(),
        title: 'About Us',
        slug: 'about-us',
        siteId: testSite.id,
        content: 'About us content',
        authorId: testUser.id,
      };

      const created = await pageModel.create(newPage);
      expect(created.title).toBe('About Us');
      expect(created.slug).toBe('about-us');

      const found = await pageModel.findById(created.id);
      expect(found?.title).toBe('About Us');
    });
  });

  describe('Media Model Tests', () => {
    const mediaModel = createModel(media, testDb);

    it('should create and find media', async () => {
      const newMedia = {
        id: generateId(),
        filename: 'test.jpg',
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/test.jpg',
        authorId: testUser.id,
        siteId: testSite.id,
      };

      const created = await mediaModel.create(newMedia);
      expect(created.filename).toBe('test.jpg');
      expect(created.mimeType).toBe('image/jpeg');

      const found = await mediaModel.findById(created.id);
      expect(found?.filename).toBe('test.jpg');
    });
  });

  describe('Theme Model Tests', () => {
    const themeModel = createModel(themes, testDb);

    it('should create and find themes', async () => {
      const newTheme = {
        id: generateId(),
        name: 'Test Theme',
        version: '1.0.0',
        description: 'A test theme',
        status: 'inactive',
        authorId: testUser.id,
        requires: '1.0.0',
      };

      const created = await themeModel.create(newTheme);
      expect(created.name).toBe('Test Theme');
      expect(created.status).toBe('inactive');

      const found = await themeModel.findById(created.id);
      expect(found?.name).toBe('Test Theme');
    });
  });

  describe('Plugin Model Tests', () => {
    const pluginModel = createModel(plugins, testDb);

    it('should create and find plugins', async () => {
      const newPlugin = {
        id: generateId(),
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        status: 'inactive',
        authorId: testUser.id,
        requires: '1.0.0',
      };

      const created = await pluginModel.create(newPlugin);
      expect(created.name).toBe('Test Plugin');
      expect(created.status).toBe('inactive');

      const found = await pluginModel.findById(created.id);
      expect(found?.name).toBe('Test Plugin');
    });
  });

  describe('Option Model Tests', () => {
    const optionModel = createModel(options, testDb);

    it('should create and find options', async () => {
      const newOption = {
        id: generateId(),
        name: 'site_title',
        value: 'My Site',
        siteId: testSite.id,
      };

      const created = await optionModel.create(newOption);
      expect(created.name).toBe('site_title');
      expect(created.value).toBe('My Site');

      const found = await optionModel.findById(created.id);
      expect(found?.name).toBe('site_title');
    });
  });

  describe('Template Model Tests', () => {
    const templateModel = createModel(templates, testDb);

    it('should create and find templates', async () => {
      const newTemplate = {
        id: generateId(),
        name: 'Test Template',
        type: 'page',
        content: 'Template content',
        authorId: testUser.id,
      };

      const created = await templateModel.create(newTemplate);
      expect(created.name).toBe('Test Template');
      expect(created.type).toBe('page');

      const found = await templateModel.findById(created.id);
      expect(found?.name).toBe('Test Template');
    });
  });

  describe('Block Storage Tests (within Pages)', () => {
    const pageModel = createModel(pages, testDb);

    it('should create and find pages with blocks', async () => {
      const blockConfig = {
        id: generateId(),
        name: 'heading',
        type: 'block',
        parentId: null,
        content: { text: 'Test Heading', level: 1 },
        styles: {},
      };

      const newPage = {
        id: generateId(),
        title: 'Test Page with Blocks',
        content: 'Page content',
        slug: 'test-page-blocks',
        siteId: testSite.id,
        authorId: testUser.id,
        blocks: [blockConfig],
      };

      const created = await pageModel.create(newPage);
      expect(created.blocks).toBeDefined();
      expect(Array.isArray(created.blocks)).toBe(true);
      expect(created.blocks).toHaveLength(1);

      const found = await pageModel.findById(created.id);
      expect(found?.blocks).toHaveLength(1);
      expect((found?.blocks as any)[0].name).toBe('heading');
    });
  });

  describe('Error Handling', () => {
    const userModel = createModel(users, testDb);

    it('should throw error for invalid column in filter', async () => {
      await expect(
        userModel.findManyWhere([{ where: 'invalidColumn', equals: 'value' }]),
      ).rejects.toThrow("Column 'invalidColumn' does not exist on table");
    });

    it('should throw error for invalid column in orderBy', async () => {
      await expect(
        userModel.findMany({
          orderBy: { property: 'invalidColumn', order: 'ascending' },
        }),
      ).rejects.toThrow("Column 'invalidColumn' does not exist on table");
    });

    it('should throw error for filter without operator', async () => {
      await expect(
        userModel.findManyWhere([{ where: 'username' }]),
      ).rejects.toThrow("No operator provided for where 'username'");
    });
  });

  describe('SQL Filter Tests', () => {
    const userModel = createModel(users, testDb);

    it('should handle SQL filters', async () => {
      await userModel.create({
        id: generateId(),
        username: 'admin',
        email: 'admin@example.com',
        password: 'password',
      });

      // Test SQL filter
      const results = await userModel.findManyWhere([
        { sql: sql`username LIKE '%admin%'` },
      ]);
      expect(results).toHaveLength(1);
      expect(results[0].username).toBe('admin');
    });

    it('should handle SQL order', async () => {
      await userModel.create({
        id: generateId(),
        username: 'auser',
        email: 'a@example.com',
        password: 'password',
      });

      const results = await userModel.findMany({
        orderBy: { sql: sql`username ASC` },
      });
      expect(results[0].username).toBe('auser');
      expect(results[1].username).toBe('testuser');
    });
  });
});
