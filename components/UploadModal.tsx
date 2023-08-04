"use client";

import useUploadModal from "@/hooks/useUploadModal";
import Modal from "./Modal";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useState } from "react";
import Input from "./Input";
import Button from "./Button";
import { toast } from "react-hot-toast";
import { useUser } from "@/hooks/useUser";
import uniqid from "uniqid";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

const UploadModal = () => {


    const [isLoading, setIsLoading] = useState(false);
    const supbaseClient = useSupabaseClient();
    const uploadModal = useUploadModal();
    const { user } = useUser();
    const router = useRouter();

    const {
        register,
        handleSubmit,
        reset
    } = useForm<FieldValues>({
        defaultValues: {
            author: '',
            title: '',
            song: null,
            image: null,
        }
    });

    const onChange = (open: boolean) => {
        if(!open) {
            reset();
            uploadModal.onClose();
        }
    };

    const onSubmit : SubmitHandler<FieldValues> = async (values) => {
        try {
            setIsLoading(true);

            const imageFile = values.image?.[0];
            const songFile = values.song?.[0];

            if(!imageFile && !songFile && !user)
            {
                toast.error("Missing fields!");
                return;
            }

            const uniqueID = uniqid();

            const {
                data: songData,
                error: songError
            } = await supbaseClient
            .storage
            .from('songs')
            .upload(`song-${values.title}-${uniqueID}`, songFile, {
                cacheControl: '3600',
                upsert: false
            });

            if(songError)
            {
                setIsLoading(false);
                return toast.error('Failed song upload!');
            }

            const {
                data: imageData,
                error: imageError
            } = await supbaseClient
            .storage
            .from('images')
            .upload(`image-${values.title}-${uniqueID}`, imageFile, {
                cacheControl: '3600',
                upsert: false
            });

            if(imageError)
            {
                setIsLoading(false);
                return toast.error('Failed image upload!');
            }

            const {
                error: supabaseError
            } = await supbaseClient
            .from('songs')
            .insert({
                user_id: user?.id,
                title: values.title,
                author: values.author,
                image_path: imageData.path,
                song_path: songData.path
            })

            if(supabaseError)
            {
                setIsLoading(false);
                return toast.error(supabaseError.message)
            }

            router.refresh();
            setIsLoading(false);

            toast.success("Song created!");

            reset();
        }
        catch(error)
        {
            toast.error("Something went wrong!");
        }
        finally
        {
            setIsLoading(false);
        }
    }

    return (
        <Modal
            title="Add a song"
            description="Upload an mp3 file"
            isOpen={uploadModal.isOpen}
            onChange={onChange}
        >
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="
                    flex flex-col gap-y-4
                "
            >
                <Input 
                    id="title"
                    disabled={isLoading}
                    {...register('title', {required: true})}
                    placeholder="Song title"
                />
                <Input 
                    id="author"
                    disabled={isLoading}
                    {...register('author', {required: true})}
                    placeholder="Author Name"
                />
                <div>
                    <div>
                        Select a song file
                    </div>
                    <Input 
                    id="song"
                    type="file"
                    accept=".mp3"
                    disabled={isLoading}
                    {...register('song', {required: true})}
                    />
                </div>
                <div>
                    <div>
                        Select an image
                    </div>
                    <Input 
                    id="image"
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    {...register('image', {required: true})}
                    />
                </div>
                <Button disabled={isLoading} type="submit">
                    Create
                </Button>
            </form>
        </Modal>
    );
};

export default UploadModal;