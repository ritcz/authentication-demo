import "dotenv/config";
import crypto from "crypto";
import { UserInputError } from "apollo-server-core";
import { User } from "./models.js";
import { getHash } from "./utils.js";

export const resolvers = {
  Query: {
    session: async (_, args, context) => {
      return context.session;
    },
    users: async (_, args, { user }) => {
      if (!user) throw new Error("User not authenticated.");

      return await User.findAll();
    },
    user: async (_, { id }, { user }) => {
      if (!user) throw new Error("User not authenticated.");

      return await User.findByPk(id);
    },
  },
  Mutation: {
    createUser: async (_, { input }) => {
      try {
        const { email, firstName, lastName, password } = input;

        const passwordHash = await getHash(password);

        const user = {
          email,
          firstName,
          lastName,
          passwordHash,
        };
        await User.create(user);
        return { ok: true };
      } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
          throw new UserInputError(
            "A user with that email address is already registsered.",
            error
          );
        }
        throw error;
      }
    },
    authenticate: async (_, { username, password }, { session }) => {
      const user = await User.findOne({ where: { email: username } });

      if (!user) throw new Error("Incorect username or password.");

      const passwordHash = await getHash(password);
      if (
        !crypto.timingSafeEqual(
          Buffer.from(user.passwordHash),
          Buffer.from(passwordHash)
        )
      ) {
        throw new Error("Incorrect username or password.");
      }

      // start session
      session.user = user.get();

      return {
        ok: true,
        user: {
          ...user.get(),
        },
      };
    },
    logout: async (_, args, context) => {
      if (context && context.session) {
        context.session.destroy(() => ({
          ok: true,
        }));
      }
    },
  },
};
